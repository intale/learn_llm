//! Explicit logical-to-physical mapping for the local operational cache.
//! No content ID is interpreted as a filesystem path.
use std::collections::{BTreeMap, BTreeSet};
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};

use crate::artifact::{
    acquisition::{AssetStore, StagedAssets},
    canonical_manifest::{
        DatasetArtifactManifestV2, PayloadEntry, artifact_id, canonical_manifest_bytes,
    },
    inventory::{AssetSource, VerifiedBundle, verify_payload},
    lineage::AcquisitionError,
};
use rustix::fd::OwnedFd;
use rustix::fs::{self, Dir, FileType, Mode, OFlags};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FileLayout {
    pub manifest_path: String,
    pub payload_paths: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CacheLayout {
    pub entry_prefix: String,
    pub lock_file: String,
    pub pending_prefix: String,
}

fn physical_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= 4096
        && path.split('/').all(|part| {
            !part.is_empty()
                && part != "."
                && part != ".."
                && part
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.'))
        })
}

impl FileLayout {
    pub fn validate(&self) -> Result<(), AcquisitionError> {
        if self.payload_paths.is_empty() || self.payload_paths.len() > 4096 {
            return Err(AcquisitionError::Inventory);
        }
        let mut names = BTreeSet::new();
        for path in std::iter::once(&self.manifest_path).chain(self.payload_paths.values()) {
            if !physical_path(path) || !names.insert(path.to_ascii_lowercase()) {
                return Err(AcquisitionError::Inventory);
            }
        }
        let paths: Vec<_> = names.iter().collect();
        for path in &paths {
            if paths
                .iter()
                .any(|other| other.starts_with(&format!("{path}/")))
            {
                return Err(AcquisitionError::Inventory);
            }
        }
        Ok(())
    }
}

impl CacheLayout {
    pub fn validate(&self) -> Result<(), AcquisitionError> {
        if !physical_path(&self.lock_file)
            || self.lock_file.contains('/')
            || [self.entry_prefix.as_str(), self.pending_prefix.as_str()]
                .iter()
                .any(|p| {
                    p.contains('/')
                        || !p
                            .bytes()
                            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
                })
            || self.entry_prefix == self.pending_prefix
        {
            return Err(AcquisitionError::Inventory);
        }
        Ok(())
    }

    pub fn entry_name(&self, digest: &str) -> Result<String, AcquisitionError> {
        self.validate()?;
        if digest.len() != 64
            || !digest
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        {
            return Err(AcquisitionError::Hash);
        }
        Ok(format!("{}{digest}", self.entry_prefix))
    }
}

/// Anchored no-follow filesystem access. The caller owns the root authority.
struct Directory {
    fd: OwnedFd,
}

impl Directory {
    fn open(path: &Path) -> Result<Self, AcquisitionError> {
        let start = if path.is_absolute() { "/" } else { "." };
        let mut fd = fs::open(
            start,
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::CLOEXEC,
            Mode::empty(),
        )
        .map_err(|_| AcquisitionError::Io)?;
        for part in path.components() {
            match part {
                Component::RootDir => (),
                Component::Normal(name) => {
                    fd = fs::openat(
                        &fd,
                        name,
                        OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
                        Mode::empty(),
                    )
                    .map_err(|_| AcquisitionError::Inventory)?
                }
                _ => return Err(AcquisitionError::Inventory),
            }
        }
        Ok(Self { fd })
    }

    fn child(&self, name: &str) -> Result<Self, AcquisitionError> {
        let fd = fs::openat(
            &self.fd,
            name,
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        )
        .map_err(|_| AcquisitionError::Inventory)?;
        Ok(Self { fd })
    }

    fn clone_dir(&self) -> Result<Self, AcquisitionError> {
        Ok(Self {
            fd: self.fd.try_clone().map_err(|_| AcquisitionError::Io)?,
        })
    }

    fn file(&self, name: &str, create: bool) -> Result<File, AcquisitionError> {
        let mut flags = OFlags::NOFOLLOW | OFlags::CLOEXEC | OFlags::NONBLOCK;
        flags |= if create {
            OFlags::RDWR | OFlags::CREATE | OFlags::EXCL
        } else {
            OFlags::RDONLY
        };
        let fd = fs::openat(&self.fd, name, flags, Mode::RUSR | Mode::WUSR)
            .map_err(|_| AcquisitionError::Io)?;
        let stat = fs::fstat(&fd).map_err(|_| AcquisitionError::Io)?;
        if FileType::from_raw_mode(stat.st_mode) != FileType::RegularFile || stat.st_nlink != 1 {
            return Err(AcquisitionError::Inventory);
        }
        Ok(File::from(fd))
    }

    fn parent(&self, path: &str, create: bool) -> Result<(Self, String), AcquisitionError> {
        if !physical_path(path) {
            return Err(AcquisitionError::Inventory);
        }
        let parts: Vec<_> = path.split('/').collect();
        let mut directory = self.clone_dir()?;
        for part in &parts[..parts.len() - 1] {
            if create {
                match fs::mkdirat(&directory.fd, *part, Mode::RWXU) {
                    Ok(()) => directory.sync()?,
                    Err(rustix::io::Errno::EXIST) => (),
                    Err(_) => return Err(AcquisitionError::Io),
                }
            }
            directory = directory.child(part)?;
        }
        Ok((directory, parts[parts.len() - 1].into()))
    }

    fn mapped_file(&self, path: &str, create: bool) -> Result<File, AcquisitionError> {
        let (parent, name) = self.parent(path, create)?;
        parent.file(&name, create)
    }

    fn sync(&self) -> Result<(), AcquisitionError> {
        fs::fsync(&self.fd).map_err(|_| AcquisitionError::Io)
    }

    fn sync_tree(&self) -> Result<(), AcquisitionError> {
        let mut stream = Dir::read_from(&self.fd).map_err(|_| AcquisitionError::Io)?;
        while let Some(entry) = stream.read() {
            let entry = entry.map_err(|_| AcquisitionError::Io)?;
            let name = entry
                .file_name()
                .to_str()
                .map_err(|_| AcquisitionError::Inventory)?;
            if matches!(name, "." | "..") {
                continue;
            }
            let stat = fs::statat(&self.fd, name, fs::AtFlags::SYMLINK_NOFOLLOW)
                .map_err(|_| AcquisitionError::Io)?;
            if FileType::from_raw_mode(stat.st_mode) == FileType::Directory {
                self.child(name)?.sync_tree()?;
            }
        }
        self.sync()
    }

    fn inventory(
        &self,
        expected: &BTreeSet<String>,
        optional: Option<&str>,
    ) -> Result<(), AcquisitionError> {
        fn walk(
            directory: &Directory,
            prefix: &str,
            expected: &BTreeSet<String>,
            optional: Option<&str>,
            seen: &mut BTreeSet<String>,
            depth: usize,
        ) -> Result<(), AcquisitionError> {
            if depth > 64 {
                return Err(AcquisitionError::Inventory);
            }
            let mut stream = Dir::read_from(&directory.fd).map_err(|_| AcquisitionError::Io)?;
            while let Some(entry) = stream.read() {
                let entry = entry.map_err(|_| AcquisitionError::Io)?;
                let name = entry
                    .file_name()
                    .to_str()
                    .map_err(|_| AcquisitionError::Inventory)?;
                if matches!(name, "." | "..") {
                    continue;
                }
                let path = if prefix.is_empty() {
                    name.into()
                } else {
                    format!("{prefix}/{name}")
                };
                if !physical_path(&path) {
                    return Err(AcquisitionError::Inventory);
                }
                if expected.contains(&path) || optional == Some(path.as_str()) {
                    let _ = directory.file(name, false)?;
                    if !seen.insert(path) {
                        return Err(AcquisitionError::Inventory);
                    }
                } else if expected.iter().any(|p| p.starts_with(&format!("{path}/")))
                    || optional.is_some_and(|p| p.starts_with(&format!("{path}/")))
                {
                    walk(
                        &directory.child(name)?,
                        &path,
                        expected,
                        optional,
                        seen,
                        depth + 1,
                    )?;
                } else {
                    return Err(AcquisitionError::Inventory);
                }
            }
            Ok(())
        }
        let mut seen = BTreeSet::new();
        walk(self, "", expected, optional, &mut seen, 0)?;
        if expected.iter().any(|p| !seen.contains(p)) {
            return Err(AcquisitionError::Inventory);
        }
        Ok(())
    }
}

pub struct FileSource {
    directory: Directory,
    layout: FileLayout,
}

/// Run-owned provisional output, never a published cache entry. This reuses the
/// existing anchored adapter and explicit ID mapping while hashes are unknown.
/// Only the normal verified FileStore publication can later admit these bytes.
pub struct ProvisionalOutput {
    directory: Directory,
    layout: FileLayout,
    created: BTreeSet<String>,
}

impl ProvisionalOutput {
    pub fn new(root: &Path, layout: FileLayout) -> Result<Self, AcquisitionError> {
        layout.validate()?;
        let directory = Directory::open(root)?;
        directory.inventory(&BTreeSet::new(), None)?;
        Ok(Self {
            directory,
            layout,
            created: BTreeSet::new(),
        })
    }

    pub fn create_payload(&mut self, id: &str) -> Result<File, AcquisitionError> {
        let path = self
            .layout
            .payload_paths
            .get(id)
            .ok_or(AcquisitionError::Inventory)?;
        if !self.created.insert(id.into()) {
            return Err(AcquisitionError::Inventory);
        }
        self.directory.mapped_file(path, true)
    }

    pub fn finish_manifest(
        &self,
        manifest: &DatasetArtifactManifestV2,
    ) -> Result<(), AcquisitionError> {
        let ids: BTreeSet<_> = manifest.payload.iter().map(|p| p.id.clone()).collect();
        if ids != self.created || ids != self.layout.payload_paths.keys().cloned().collect() {
            return Err(AcquisitionError::Incomplete);
        }
        self.directory
            .inventory(&self.layout.payload_paths.values().cloned().collect(), None)?;
        for expected in &manifest.payload {
            let path = self
                .layout
                .payload_paths
                .get(&expected.id)
                .ok_or(AcquisitionError::Inventory)?;
            verify_payload(
                expected,
                &mut StableFileReader::new(self.directory.mapped_file(path, false)?)?,
            )?;
        }
        let mut metadata = self
            .directory
            .mapped_file(&self.layout.manifest_path, true)?;
        metadata
            .write_all(&canonical_manifest_bytes(manifest)?)
            .map_err(|_| AcquisitionError::Io)?;
        metadata.sync_all().map_err(|_| AcquisitionError::Io)?;
        self.directory.sync_tree()
    }
}

/// Single-call Read delegation plus before/after file-identity checks; no retry
/// loop or transport logic. IO failures use the standard reader error boundary.
pub struct StableFileReader {
    file: File,
    before: fs::Stat,
}

impl StableFileReader {
    fn new(file: File) -> Result<Self, AcquisitionError> {
        let before = fs::fstat(&file).map_err(|_| AcquisitionError::Io)?;
        Ok(Self { file, before })
    }
}

impl Read for StableFileReader {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        let count = self.file.read(buffer)?;
        if count == 0 && !buffer.is_empty() {
            let after = fs::fstat(&self.file).map_err(io::Error::from)?;
            if after.st_dev != self.before.st_dev
                || after.st_ino != self.before.st_ino
                || after.st_size != self.before.st_size
                || after.st_nlink != 1
                || after.st_mtime != self.before.st_mtime
                || after.st_mtime_nsec != self.before.st_mtime_nsec
                || after.st_ctime != self.before.st_ctime
                || after.st_ctime_nsec != self.before.st_ctime_nsec
            {
                return Err(io::Error::other("asset file changed while reading"));
            }
        }
        Ok(count)
    }
}

impl FileSource {
    pub fn new(root: &Path, layout: FileLayout) -> Result<Self, AcquisitionError> {
        layout.validate()?;
        Ok(Self {
            directory: Directory::open(root)?,
            layout,
        })
    }

    pub fn manifest_reader(&self) -> Result<StableFileReader, AcquisitionError> {
        StableFileReader::new(
            self.directory
                .mapped_file(&self.layout.manifest_path, false)?,
        )
    }
}

impl AssetSource for FileSource {
    type Reader = StableFileReader;
    fn payload_ids(&mut self) -> Result<Vec<String>, AcquisitionError> {
        self.directory.inventory(
            &self.layout.payload_paths.values().cloned().collect(),
            Some(&self.layout.manifest_path),
        )?;
        Ok(self.layout.payload_paths.keys().cloned().collect())
    }
    fn open_payload(&mut self, expected: &PayloadEntry) -> Result<Self::Reader, AcquisitionError> {
        let path = self
            .layout
            .payload_paths
            .get(&expected.id)
            .ok_or(AcquisitionError::Inventory)?;
        StableFileReader::new(self.directory.mapped_file(path, false)?)
    }
}

pub struct FileStore {
    parent: PathBuf,
    files: FileLayout,
    cache: CacheLayout,
}

impl FileStore {
    pub fn new(
        parent: impl Into<PathBuf>,
        files: FileLayout,
        cache: CacheLayout,
    ) -> Result<Self, AcquisitionError> {
        files.validate()?;
        cache.validate()?;
        Ok(Self {
            parent: parent.into(),
            files,
            cache,
        })
    }
}

pub struct FileStage {
    parent: Directory,
    entry: Directory,
    _lock: File,
    files: FileLayout,
    manifest: DatasetArtifactManifestV2,
    digest: String,
    pending_name: String,
    entry_name: String,
    created: BTreeSet<String>,
    finished: BTreeSet<String>,
}

impl AssetStore for FileStore {
    type Stage<'a> = FileStage;
    fn stage(
        &mut self,
        manifest: &DatasetArtifactManifestV2,
    ) -> Result<Self::Stage<'_>, AcquisitionError> {
        let expected: BTreeSet<_> = manifest.payload.iter().map(|p| p.id.clone()).collect();
        if expected != self.files.payload_paths.keys().cloned().collect() {
            return Err(AcquisitionError::Inventory);
        }
        let digest = artifact_id(manifest)?.as_hex().to_owned();
        let entry_name = self.cache.entry_name(&digest)?;
        let pending_name = format!("{}{digest}", self.cache.pending_prefix);
        if self.cache.lock_file == entry_name
            || self.cache.lock_file == pending_name
            || entry_name == pending_name
        {
            return Err(AcquisitionError::Inventory);
        }
        let parent = Directory::open(&self.parent)?;
        let lock_fd = fs::openat(
            &parent.fd,
            &self.cache.lock_file,
            OFlags::RDWR | OFlags::CREATE | OFlags::NOFOLLOW | OFlags::CLOEXEC | OFlags::NONBLOCK,
            Mode::RUSR | Mode::WUSR,
        )
        .map_err(|_| AcquisitionError::Io)?;
        let stat = fs::fstat(&lock_fd).map_err(|_| AcquisitionError::Io)?;
        if FileType::from_raw_mode(stat.st_mode) != FileType::RegularFile || stat.st_nlink != 1 {
            return Err(AcquisitionError::Inventory);
        }
        let lock = File::from(lock_fd);
        fs::flock(&lock, fs::FlockOperation::NonBlockingLockExclusive)
            .map_err(|_| AcquisitionError::Io)?;
        match fs::statat(&parent.fd, &entry_name, fs::AtFlags::SYMLINK_NOFOLLOW) {
            Ok(_) => return Err(AcquisitionError::AlreadyPublished),
            Err(rustix::io::Errno::NOENT) => (),
            Err(_) => return Err(AcquisitionError::Io),
        }
        fs::mkdirat(&parent.fd, &pending_name, Mode::RWXU).map_err(|_| AcquisitionError::Io)?;
        parent.sync()?;
        let entry = parent.child(&pending_name)?;
        Ok(FileStage {
            parent,
            entry,
            _lock: lock,
            files: self.files.clone(),
            manifest: manifest.clone(),
            digest,
            pending_name,
            entry_name,
            created: BTreeSet::new(),
            finished: BTreeSet::new(),
        })
    }
}

impl StagedAssets for FileStage {
    type Writer = File;
    fn create_payload(
        &mut self,
        expected: &PayloadEntry,
    ) -> Result<Self::Writer, AcquisitionError> {
        if !self.manifest.payload.contains(expected) || !self.created.insert(expected.id.clone()) {
            return Err(AcquisitionError::Inventory);
        }
        let path = self
            .files
            .payload_paths
            .get(&expected.id)
            .ok_or(AcquisitionError::Inventory)?;
        self.entry.mapped_file(path, true)
    }

    fn finish_payload(
        &mut self,
        expected: &PayloadEntry,
        mut writer: Self::Writer,
    ) -> Result<(), AcquisitionError> {
        if !self.created.contains(&expected.id) || self.finished.contains(&expected.id) {
            return Err(AcquisitionError::Inventory);
        }
        writer.flush().map_err(|_| AcquisitionError::Io)?;
        writer.sync_all().map_err(|_| AcquisitionError::Io)?;
        drop(writer);
        let path = self
            .files
            .payload_paths
            .get(&expected.id)
            .ok_or(AcquisitionError::Inventory)?;
        verify_payload(
            expected,
            &mut StableFileReader::new(self.entry.mapped_file(path, false)?)?,
        )?;
        self.finished.insert(expected.id.clone());
        Ok(())
    }

    fn publish(
        self,
        canonical_manifest: &[u8],
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError> {
        if canonical_manifest_bytes(&self.manifest)? != canonical_manifest
            || proof.artifact_id() != self.digest
            || self.finished != self.files.payload_paths.keys().cloned().collect()
            || proof.payloads().len() != self.finished.len()
        {
            return Err(AcquisitionError::Incomplete);
        }
        self.entry
            .inventory(&self.files.payload_paths.values().cloned().collect(), None)?;
        for expected in &self.manifest.payload {
            let path = self
                .files
                .payload_paths
                .get(&expected.id)
                .ok_or(AcquisitionError::Inventory)?;
            verify_payload(
                expected,
                &mut StableFileReader::new(self.entry.mapped_file(path, false)?)?,
            )?;
        }
        let mut metadata = self.entry.mapped_file(&self.files.manifest_path, true)?;
        metadata
            .write_all(canonical_manifest)
            .map_err(|_| AcquisitionError::Io)?;
        metadata.sync_all().map_err(|_| AcquisitionError::Io)?;
        drop(metadata);
        self.entry.inventory(
            &self
                .files
                .payload_paths
                .values()
                .cloned()
                .chain(std::iter::once(self.files.manifest_path.clone()))
                .collect(),
            None,
        )?;
        self.entry.sync_tree()?;
        fs::renameat_with(
            &self.parent.fd,
            &self.pending_name,
            &self.parent.fd,
            &self.entry_name,
            fs::RenameFlags::NOREPLACE,
        )
        .map_err(|error| {
            if error == rustix::io::Errno::EXIST {
                AcquisitionError::AlreadyPublished
            } else {
                AcquisitionError::Io
            }
        })?;
        self.parent.sync()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::artifact::{
        acquisition::{acquire_bundle, replay_bundle},
        canonical_manifest::{
            Attribution, DatasetScope, License, Producer, Redistribution, SourceRecord,
        },
        inventory::verify_bundle,
        lineage::DatasetPolicy,
    };
    use llm_from_scratch::artifact_identity::sha256;
    use std::sync::atomic::{AtomicU64, Ordering};
    static NEXT: AtomicU64 = AtomicU64::new(0);
    struct Temp(PathBuf);
    impl Temp {
        fn new() -> Self {
            let stamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "content-adapter-{}-{stamp}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
    }
    impl Drop for Temp {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    fn example() -> (
        DatasetArtifactManifestV2,
        FileLayout,
        CacheLayout,
        BTreeMap<String, Vec<u8>>,
    ) {
        let bodies: BTreeMap<String, Vec<u8>> = [
            ("content/一", b"abc".to_vec()),
            ("license:terms", b"license".to_vec()),
            ("provider/credit", b"credit".to_vec()),
        ]
        .into_iter()
        .map(|(k, v)| (k.into(), v))
        .collect();
        let payload = bodies
            .iter()
            .map(|(id, body)| PayloadEntry {
                bytes: body.len() as u64,
                id: id.clone(),
                media_type: "application/octet-stream".into(),
                role: "fixture-blob".into(),
                sha256: sha256(body).as_hex().into(),
            })
            .collect();
        let manifest = DatasetArtifactManifestV2 {
            dataset_scope: DatasetScope {
                domain: "fixture".into(),
                language: "en".into(),
                selected_source: "operational-test".into(),
            },
            kind: "dataset".into(),
            payload,
            producer: Producer {
                config_sha256: "0".repeat(64),
                script_sha256: "0".repeat(64),
            },
            redistribution: Redistribution {
                adapter: "not-reviewed".into(),
                derived_model: "not-reviewed".into(),
                raw_input: "not-reviewed".into(),
            },
            schema_version: 2,
            sources: vec![SourceRecord {
                attribution: Attribution {
                    content_id: "provider/credit".into(),
                    references: vec!["selected-provider-reference".into()],
                },
                content_id: "content/一".into(),
                license: License {
                    content_id: "license:terms".into(),
                    identifier: "test-terms".into(),
                },
                reference: "caller-supplied-reference".into(),
                source_id: "source-one".into(),
                upstream_revision: "fixture-revision".into(),
            }],
        };
        let files = FileLayout {
            manifest_path: "description/custom-descriptor.json".into(),
            payload_paths: [
                ("content/一", "bytes/a.bin"),
                ("license:terms", "rights/license.bin"),
                ("provider/credit", "credit.bin"),
            ]
            .into_iter()
            .map(|(id, path)| (id.into(), path.into()))
            .collect(),
        };
        let cache = CacheLayout {
            entry_prefix: "bundle-".into(),
            lock_file: "writer.lock".into(),
            pending_prefix: "unpublished-".into(),
        };
        (manifest, files, cache, bodies)
    }
    fn write_source(
        root: &Path,
        layout: &FileLayout,
        bodies: &BTreeMap<String, Vec<u8>>,
        manifest: &DatasetArtifactManifestV2,
    ) {
        for (id, path) in &layout.payload_paths {
            let target = root.join(path);
            std::fs::create_dir_all(target.parent().unwrap()).unwrap();
            std::fs::write(target, &bodies[id]).unwrap();
        }
        let target = root.join(&layout.manifest_path);
        std::fs::create_dir_all(target.parent().unwrap()).unwrap();
        std::fs::write(target, canonical_manifest_bytes(manifest).unwrap()).unwrap();
    }
    #[test]
    fn opaque_ids_and_custom_metadata_map_to_independent_physical_paths() {
        let (manifest, files, cache, bodies) = example();
        let source_root = Temp::new();
        let cache_root = Temp::new();
        write_source(&source_root.0, &files, &bodies, &manifest);
        let policy = DatasetPolicy::new(manifest.clone(), "synthetic-operational-fixture").unwrap();
        let mut source = FileSource::new(&source_root.0, files.clone()).unwrap();
        let mut destination = FileStore::new(&cache_root.0, files.clone(), cache.clone()).unwrap();
        let proof = acquire_bundle(&manifest, &policy, &mut source, &mut destination).unwrap();
        let entry = cache_root
            .0
            .join(cache.entry_name(proof.artifact_id()).unwrap());
        assert!(entry.join(&files.manifest_path).is_file());
        assert!(!entry.join("artifact-manifest.json").exists());
        assert!(!entry.join("content/一").exists());
        let mut replay = FileSource::new(&entry, files).unwrap();
        let loaded = replay_bundle(
            proof.artifact_id(),
            &mut replay.manifest_reader().unwrap(),
            &policy,
            &mut replay,
        )
        .unwrap();
        assert_eq!(loaded, proof);
    }
    #[test]
    fn layout_alias_traversal_case_collision_and_metadata_collision_refuse() {
        let (_, files, _, _) = example();
        for bad in ["../outside", "/absolute", "a//b", "a/./b", "a\\b"] {
            let mut changed = files.clone();
            changed.manifest_path = bad.into();
            assert!(changed.validate().is_err());
        }
        let mut changed = files.clone();
        changed.manifest_path = changed.payload_paths.values().next().unwrap().clone();
        assert!(changed.validate().is_err());
        let mut changed = files;
        let path = changed
            .payload_paths
            .values()
            .next()
            .unwrap()
            .to_uppercase();
        changed.payload_paths.insert("other-id".into(), path);
        assert!(changed.validate().is_err());
    }
    #[test]
    fn undeclared_or_linked_physical_files_refuse_and_failed_stage_is_not_published() {
        let (manifest, files, cache, bodies) = example();
        let source_root = Temp::new();
        let cache_root = Temp::new();
        write_source(&source_root.0, &files, &bodies, &manifest);
        let policy = DatasetPolicy::new(manifest.clone(), "synthetic-operational-fixture").unwrap();
        std::fs::write(source_root.0.join("unlisted"), b"extra").unwrap();
        let mut source = FileSource::new(&source_root.0, files.clone()).unwrap();
        assert_eq!(
            verify_bundle(&manifest, &policy, &mut source),
            Err(AcquisitionError::Inventory)
        );
        std::fs::remove_file(source_root.0.join("unlisted")).unwrap();
        let path = source_root.0.join(&files.payload_paths["provider/credit"]);
        let external = Temp::new();
        let external_file = external.0.join("credit-bytes");
        std::fs::write(&external_file, &bodies["provider/credit"]).unwrap();
        for symbolic in [true, false] {
            std::fs::remove_file(&path).unwrap();
            if symbolic {
                std::os::unix::fs::symlink(&external_file, &path).unwrap();
            } else {
                std::fs::hard_link(&external_file, &path).unwrap();
            }
            let mut linked = FileSource::new(&source_root.0, files.clone()).unwrap();
            assert!(verify_bundle(&manifest, &policy, &mut linked).is_err());
        }
        std::fs::remove_file(&path).unwrap();
        std::fs::write(&path, b"broken").unwrap();
        let mut destination = FileStore::new(&cache_root.0, files.clone(), cache.clone()).unwrap();
        let mut source = FileSource::new(&source_root.0, files).unwrap();
        assert_eq!(
            acquire_bundle(&manifest, &policy, &mut source, &mut destination),
            Err(AcquisitionError::Hash)
        );
        let digest = artifact_id(&manifest).unwrap();
        assert!(
            !cache_root
                .0
                .join(cache.entry_name(digest.as_hex()).unwrap())
                .exists()
        );
        assert!(
            cache_root
                .0
                .join(format!("{}{digest}", cache.pending_prefix))
                .is_dir()
        );
    }
}
