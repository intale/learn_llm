// Bounded streaming verification and descriptor-relative filesystem plumbing.
// Rustix supplies safe OS operations; course checks decide which objects count.

use std::collections::BTreeSet;
use std::fs::File;
use std::io::{Read, Write};
use std::os::fd::OwnedFd;
use std::path::{Component, Path, PathBuf};

use rustix::fs::{self, Dir, FileType, Mode, OFlags};
use sha2::{Digest, Sha256};

use super::canonical_manifest::{
    DatasetArtifactManifestV1, MAX_MANIFEST_BYTES, PayloadEntry, STREAM_BUFFER_BYTES, artifact_id,
    canonical_manifest_bytes, portable_payload_path,
};
use super::lineage::{AcquisitionError, DatasetPolicy};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifiedPayload {
    path: String,
    bytes: u64,
    sha256: String,
}
impl VerifiedPayload {
    pub fn path(&self) -> &str {
        &self.path
    }
    pub fn bytes(&self) -> u64 {
        self.bytes
    }
    pub fn sha256(&self) -> &str {
        &self.sha256
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifiedBundle {
    artifact_id: String,
    evidence_kind: String,
    files: Vec<VerifiedPayload>,
    total_bytes: u64,
}

/// Read one bounded manifest from an anchored parent without following links.
/// Structural parsing does not replace the caller's selected-source policy.
pub fn read_manifest(path: &Path) -> Result<DatasetArtifactManifestV1, AcquisitionError> {
    let parent = path.parent().ok_or(AcquisitionError::UnsafePath)?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or(AcquisitionError::UnsafePath)?;
    let directory = Directory::open(parent)?;
    let mut file = directory.file(name, false, false)?;
    read_manifest_from(&mut file)
}

/// Parse a bounded manifest supplied by any standard reader.
/// The reader's owner handles retrieval; this operation checks content only.
pub fn read_manifest_from<R: Read + ?Sized>(
    reader: &mut R,
) -> Result<DatasetArtifactManifestV1, AcquisitionError> {
    let mut bytes = Vec::new();
    reader
        .take(MAX_MANIFEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| AcquisitionError::Io)?;
    super::canonical_manifest::parse_dataset_manifest(&bytes)
}
impl VerifiedBundle {
    pub fn artifact_id(&self) -> &str {
        &self.artifact_id
    }
    pub fn evidence_kind(&self) -> &str {
        &self.evidence_kind
    }
    pub fn files(&self) -> &[VerifiedPayload] {
        &self.files
    }
    pub fn total_bytes(&self) -> u64 {
        self.total_bytes
    }
}

// region:bounded-payload-verification
pub fn verify_payload(
    expected: &PayloadEntry,
    reader: &mut impl Read,
) -> Result<VerifiedPayload, AcquisitionError> {
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; STREAM_BUFFER_BYTES];
    let mut total = 0_u64;
    loop {
        // Once expected bytes have arrived, one additional byte distinguishes
        // a real EOF from a same-prefix oversize object. Never retain that byte.
        let remaining = expected
            .bytes
            .checked_sub(total)
            .ok_or(AcquisitionError::Size)?;
        let allowance = remaining.min(STREAM_BUFFER_BYTES as u64) as usize;
        let count = loop {
            match reader.read(&mut buffer[..allowance.max(1)]) {
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                result => break result.map_err(|_| AcquisitionError::Io)?,
            }
        };
        if count == 0 {
            break;
        }
        total = total
            .checked_add(count as u64)
            .ok_or(AcquisitionError::Size)?;
        if total > expected.bytes {
            return Err(AcquisitionError::Size);
        }
        hasher.update(&buffer[..count]);
    }
    if total != expected.bytes {
        return Err(AcquisitionError::Size);
    }
    let digest = format!("{:x}", hasher.finalize());
    if digest != expected.sha256 {
        return Err(AcquisitionError::Hash);
    }
    Ok(VerifiedPayload {
        path: expected.path.clone(),
        bytes: total,
        sha256: digest,
    })
}
// endregion:bounded-payload-verification

/// Verify a supplied stream while copying only its declared bytes into a sink.
/// The caller owns staging: a size, digest or I/O failure can leave partial
/// bytes in this writer and must never make them an admitted artifact.
pub fn verify_payload_into<R: Read + ?Sized, W: Write + ?Sized>(
    expected: &PayloadEntry,
    reader: &mut R,
    writer: &mut W,
) -> Result<VerifiedPayload, AcquisitionError> {
    struct RecordingReader<'a, R: ?Sized, W: ?Sized> {
        reader: &'a mut R,
        writer: &'a mut W,
        remaining: u64,
    }
    impl<R: Read + ?Sized, W: Write + ?Sized> Read for RecordingReader<'_, R, W> {
        fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
            let count = self.reader.read(buffer)?;
            // The verifier may inspect one excess byte to reject a same-prefix
            // oversize stream. That byte is never persisted in the sink.
            let retained = (count as u64).min(self.remaining) as usize;
            self.writer.write_all(&buffer[..retained])?;
            self.remaining -= retained as u64;
            Ok(count)
        }
    }
    let proof = verify_payload(
        expected,
        &mut RecordingReader {
            reader,
            writer: &mut *writer,
            remaining: expected.bytes,
        },
    )?;
    writer.flush().map_err(|_| AcquisitionError::Io)?;
    Ok(proof)
}

/// A persistence adapter, not an enumeration of supported destination kinds.
/// Implementations own their storage handles and return an unpublished stage.
pub trait AssetStore {
    type Stage<'a>: StagedAssets
    where
        Self: 'a;

    fn stage(
        &mut self,
        manifest: &DatasetArtifactManifestV1,
    ) -> Result<Self::Stage<'_>, AcquisitionError>;
}

/// One unpublished bundle transaction owned by a storage adapter.
///
/// Payload writers may represent files, memory or another storage mechanism.
/// Closing a writer or dropping a failed stage must not publish anything.
/// `finish_payload` owns any necessary durability/close operation. `publish`
/// is the sole visibility boundary and must publish the exact complete manifest
/// and verified payloads atomically, or return an error without partial
/// publication. Abandoned staging may be retained for diagnosis; no cleanup or
/// database rollback success is inferred from dropping a stage.
pub trait StagedAssets {
    type Writer: Write;

    fn create_payload(&mut self, expected: &PayloadEntry)
    -> Result<Self::Writer, AcquisitionError>;
    fn finish_payload(
        &mut self,
        expected: &PayloadEntry,
        writer: Self::Writer,
    ) -> Result<(), AcquisitionError>;
    fn publish(
        self,
        manifest: &DatasetArtifactManifestV1,
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError>;
}

/// Stream a policy-approved bundle into an arbitrary transactional store.
/// The supplied readers determine retrieval; the store determines persistence.
/// No destination is made visible until every declared payload is verified.
pub fn persist_bundle_from<R: Read, S: AssetStore>(
    manifest: &DatasetArtifactManifestV1,
    policy: &DatasetPolicy,
    mut open: impl FnMut(&PayloadEntry) -> Result<R, AcquisitionError>,
    store: &mut S,
) -> Result<VerifiedBundle, AcquisitionError> {
    policy.validate_manifest(manifest)?;
    let mut stage = store.stage(manifest)?;
    let proof = verify_bundle_entries(manifest, policy, |expected| {
        let mut reader = open(expected)?;
        let mut writer = stage.create_payload(expected)?;
        let verified = verify_payload_into(expected, &mut reader, &mut writer)?;
        stage.finish_payload(expected, writer)?;
        Ok(verified)
    })?;
    stage.publish(manifest, &proof)?;
    Ok(proof)
}

/// Filesystem implementation of the same storage boundary used by other sinks.
/// The parent must already exist and be caller-authorized for a single writer.
pub struct FilesystemAssetStore {
    parent: PathBuf,
}

impl FilesystemAssetStore {
    pub fn new(parent: impl Into<PathBuf>) -> Self {
        Self {
            parent: parent.into(),
        }
    }
}

pub struct FilesystemStage {
    root: Directory,
    entry: Directory,
    payload: Directory,
    _lock: File,
    manifest_bytes: Vec<u8>,
    digest: String,
    temporary_name: String,
}

impl AssetStore for FilesystemAssetStore {
    type Stage<'a> = FilesystemStage;

    fn stage(
        &mut self,
        manifest: &DatasetArtifactManifestV1,
    ) -> Result<Self::Stage<'_>, AcquisitionError> {
        let manifest_bytes = canonical_manifest_bytes(manifest)?;
        let digest = artifact_id(manifest)?.as_hex().to_owned();
        let root = Directory::open(&self.parent)?;
        let lock = root.lock()?;
        match fs::statat(&root.fd, digest.as_str(), fs::AtFlags::SYMLINK_NOFOLLOW) {
            Ok(_) => return Err(AcquisitionError::AlreadyPublished),
            Err(rustix::io::Errno::NOENT) => (),
            Err(_) => return Err(AcquisitionError::Io),
        }
        let temporary_name = format!("pending-{digest}");
        let entry = root.create_child(&temporary_name)?;
        let payload = entry.create_child("payload")?;
        Ok(FilesystemStage {
            root,
            entry,
            payload,
            _lock: lock,
            manifest_bytes,
            digest,
            temporary_name,
        })
    }
}

impl StagedAssets for FilesystemStage {
    type Writer = File;

    fn create_payload(&mut self, expected: &PayloadEntry) -> Result<File, AcquisitionError> {
        if !portable_payload_path(&expected.path) {
            return Err(AcquisitionError::UnsafePath);
        }
        let mut directory = Directory {
            fd: self
                .payload
                .fd
                .try_clone()
                .map_err(|_| AcquisitionError::Io)?,
        };
        let mut parts = expected.path.split('/').peekable();
        while let Some(part) = parts.next() {
            if parts.peek().is_none() {
                return directory.file(part, true, true);
            }
            directory = match fs::statat(&directory.fd, part, fs::AtFlags::SYMLINK_NOFOLLOW) {
                Ok(_) => directory.child(part)?,
                Err(rustix::io::Errno::NOENT) => directory.create_child(part)?,
                Err(_) => return Err(AcquisitionError::Io),
            };
        }
        Err(AcquisitionError::UnsafePath)
    }

    fn finish_payload(&mut self, _: &PayloadEntry, writer: File) -> Result<(), AcquisitionError> {
        writer.sync_all().map_err(|_| AcquisitionError::Io)
    }

    fn publish(
        self,
        manifest: &DatasetArtifactManifestV1,
        proof: &VerifiedBundle,
    ) -> Result<(), AcquisitionError> {
        if canonical_manifest_bytes(manifest)? != self.manifest_bytes
            || artifact_id(manifest)?.as_hex() != proof.artifact_id()
            || proof.files().len() != manifest.payload.len()
        {
            return Err(AcquisitionError::Policy);
        }
        self.payload.check_inventory(&manifest.payload)?;
        let mut directories = BTreeSet::new();
        for (expected, verified) in manifest.payload.iter().zip(proof.files()) {
            // Recheck staged storage, not merely the source stream, before
            // making the complete bundle visible.
            if verify_payload(expected, &mut self.payload.payload_file(&expected.path)?)?
                != *verified
            {
                return Err(AcquisitionError::Hash);
            }
            for (offset, _) in expected.path.match_indices('/') {
                directories.insert(&expected.path[..offset]);
            }
        }
        // Reverse prefix order syncs each nested directory before its parent.
        for path in directories.into_iter().rev() {
            let mut directory = Directory {
                fd: self
                    .payload
                    .fd
                    .try_clone()
                    .map_err(|_| AcquisitionError::Io)?,
            };
            for part in path.split('/') {
                directory = directory.child(part)?;
            }
            directory.sync()?;
        }
        self.payload.sync()?;
        let mut manifest_file = self.entry.file("artifact-manifest.json", true, true)?;
        manifest_file
            .write_all(&self.manifest_bytes)
            .map_err(|_| AcquisitionError::Io)?;
        manifest_file.sync_all().map_err(|_| AcquisitionError::Io)?;
        self.entry.sync()?;
        fs::renameat_with(
            &self.root.fd,
            self.temporary_name.as_str(),
            &self.root.fd,
            self.digest.as_str(),
            fs::RenameFlags::NOREPLACE,
        )
        .map_err(|error| {
            if error == rustix::io::Errno::EXIST {
                AcquisitionError::AlreadyPublished
            } else {
                AcquisitionError::Io
            }
        })?;
        self.root.sync()
    }
}

/// An anchored directory descriptor, not an unrestricted path sandbox.
/// The caller owns the directory's authority and the single-writer lifecycle.
/// Every traversed component is opened without following links.
pub(crate) struct Directory {
    fd: OwnedFd,
}

impl Directory {
    pub(crate) fn open(path: &Path) -> Result<Self, AcquisitionError> {
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
                    .map_err(|_| AcquisitionError::UnsafePath)?;
                }
                _ => return Err(AcquisitionError::UnsafePath),
            }
        }
        Ok(Self { fd })
    }

    pub(crate) fn child(&self, name: &str) -> Result<Self, AcquisitionError> {
        if !portable_payload_path(name) || name.contains('/') {
            return Err(AcquisitionError::UnsafePath);
        }
        let fd = fs::openat(
            &self.fd,
            name,
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::empty(),
        )
        .map_err(|_| AcquisitionError::UnsafePath)?;
        Ok(Self { fd })
    }

    pub(crate) fn create_child(&self, name: &str) -> Result<Self, AcquisitionError> {
        if !portable_payload_path(name) || name.contains('/') {
            return Err(AcquisitionError::UnsafePath);
        }
        fs::mkdirat(&self.fd, name, Mode::RWXU).map_err(|_| AcquisitionError::Io)?;
        self.sync()?;
        self.child(name)
    }

    pub(crate) fn file(
        &self,
        name: &str,
        writable: bool,
        create: bool,
    ) -> Result<File, AcquisitionError> {
        if !portable_payload_path(name) || name.contains('/') {
            return Err(AcquisitionError::UnsafePath);
        }
        if !create {
            let before = fs::statat(&self.fd, name, fs::AtFlags::SYMLINK_NOFOLLOW)
                .map_err(|_| AcquisitionError::Io)?;
            if FileType::from_raw_mode(before.st_mode) != FileType::RegularFile
                || before.st_nlink != 1
            {
                return Err(AcquisitionError::FileKind);
            }
        }
        let mut flags = if writable {
            OFlags::RDWR
        } else {
            OFlags::RDONLY
        };
        flags |= OFlags::NOFOLLOW | OFlags::CLOEXEC | OFlags::NONBLOCK;
        if create {
            flags |= OFlags::CREATE | OFlags::EXCL;
        }
        let fd = fs::openat(&self.fd, name, flags, Mode::RUSR | Mode::WUSR)
            .map_err(|_| AcquisitionError::Io)?;
        let stat = fs::fstat(&fd).map_err(|_| AcquisitionError::Io)?;
        if FileType::from_raw_mode(stat.st_mode) != FileType::RegularFile || stat.st_nlink != 1 {
            return Err(AcquisitionError::FileKind);
        }
        Ok(File::from(fd))
    }

    pub(crate) fn sync(&self) -> Result<(), AcquisitionError> {
        fs::fsync(&self.fd).map_err(|_| AcquisitionError::Io)
    }

    pub(crate) fn rename(&self, old: &str, new: &str) -> Result<(), AcquisitionError> {
        for name in [old, new] {
            if !portable_payload_path(name) || name.contains('/') {
                return Err(AcquisitionError::UnsafePath);
            }
        }
        fs::renameat(&self.fd, old, &self.fd, new).map_err(|_| AcquisitionError::Io)?;
        self.sync()
    }

    pub(crate) fn atomic_record(&self, bytes: &[u8]) -> Result<(), AcquisitionError> {
        // A leftover .next file means the previous write was interrupted. It
        // is preserved and refused, never blindly truncated or treated as good.
        let mut file = self.file("progress.next", true, true)?;
        file.write_all(bytes).map_err(|_| AcquisitionError::Io)?;
        file.sync_all().map_err(|_| AcquisitionError::Io)?;
        drop(file);
        self.rename("progress.next", "progress.json")
    }

    /// Preserve only this owner's known regular partial, without replacing an
    /// earlier diagnostic. Links and special files are refused, not followed.
    pub(crate) fn quarantine_partial(&self, index: usize) -> Result<(), AcquisitionError> {
        if index >= 2 {
            return Err(AcquisitionError::Progress);
        }
        let old = format!("source-{index}.partial");
        let new = format!("quarantine-source-{index}.partial");
        let _checked = self.file(&old, false, false)?;
        fs::renameat_with(&self.fd, &old, &self.fd, &new, fs::RenameFlags::NOREPLACE)
            .map_err(|_| AcquisitionError::Io)?;
        self.sync()
    }

    pub(crate) fn lock(&self) -> Result<File, AcquisitionError> {
        let file = match self.file("acquisition.lock", true, false) {
            Ok(file) => file,
            Err(AcquisitionError::Io) => self.file("acquisition.lock", true, true)?,
            Err(error) => return Err(error),
        };
        fs::flock(&file, fs::FlockOperation::NonBlockingLockExclusive)
            .map_err(|_| AcquisitionError::ConcurrentWriter)?;
        self.sync()?;
        Ok(file)
    }

    fn check_inventory(&self, expected: &[PayloadEntry]) -> Result<(), AcquisitionError> {
        fn walk(
            directory: &Directory,
            prefix: &str,
            expected: &[PayloadEntry],
            seen: &mut BTreeSet<String>,
            depth: usize,
        ) -> Result<(), AcquisitionError> {
            if depth > 4 {
                return Err(AcquisitionError::Inventory);
            }
            let mut stream = Dir::read_from(&directory.fd).map_err(|_| AcquisitionError::Io)?;
            while let Some(entry) = stream.read() {
                let entry = entry.map_err(|_| AcquisitionError::Io)?;
                let name = entry
                    .file_name()
                    .to_str()
                    .map_err(|_| AcquisitionError::UnsafePath)?;
                if matches!(name, "." | "..") {
                    continue;
                }
                let path = if prefix.is_empty() {
                    name.to_owned()
                } else {
                    format!("{prefix}/{name}")
                };
                if !portable_payload_path(&path) {
                    return Err(AcquisitionError::UnsafePath);
                }
                if expected.iter().any(|row| row.path == path) {
                    // Type/link checks are applied again on the opened descriptor.
                    let _ = directory.file(name, false, false)?;
                    if !seen.insert(path) {
                        return Err(AcquisitionError::Inventory);
                    }
                } else if expected
                    .iter()
                    .any(|row| row.path.starts_with(&format!("{path}/")))
                {
                    walk(&directory.child(name)?, &path, expected, seen, depth + 1)?;
                } else {
                    return Err(AcquisitionError::Inventory);
                }
            }
            Ok(())
        }
        let mut seen = BTreeSet::new();
        walk(self, "", expected, &mut seen, 0)?;
        if seen.len() != expected.len() {
            return Err(AcquisitionError::Inventory);
        }
        Ok(())
    }

    pub(crate) fn payload_file(&self, path: &str) -> Result<File, AcquisitionError> {
        if !portable_payload_path(path) {
            return Err(AcquisitionError::UnsafePath);
        }
        let parts: Vec<&str> = path.split('/').collect();
        let mut parent = Self {
            fd: self.fd.try_clone().map_err(|_| AcquisitionError::Io)?,
        };
        for part in &parts[..parts.len() - 1] {
            parent = parent.child(part)?;
        }
        parent.file(parts[parts.len() - 1], false, false)
    }
}

pub fn verify_bundle(
    manifest: &DatasetArtifactManifestV1,
    payload_root: &Path,
    policy: &DatasetPolicy,
) -> Result<VerifiedBundle, AcquisitionError> {
    policy.validate_manifest(manifest)?;
    let directory = Directory::open(payload_root)?;
    directory.check_inventory(&manifest.payload)?;
    verify_bundle_entries(manifest, policy, |expected| {
        let mut file = directory.payload_file(&expected.path)?;
        let before = fs::fstat(&file).map_err(|_| AcquisitionError::Io)?;
        if before.st_size < 0 || before.st_size as u64 != expected.bytes {
            return Err(AcquisitionError::Size);
        }
        let verified = verify_payload(expected, &mut file)?;
        let after = fs::fstat(&file).map_err(|_| AcquisitionError::Io)?;
        if before.st_dev != after.st_dev
            || before.st_ino != after.st_ino
            || before.st_size != after.st_size
            || after.st_nlink != 1
        {
            return Err(AcquisitionError::FileKind);
        }
        Ok(verified)
    })
}

/// Verify the declared bundle's content through caller-supplied readers.
///
/// The provider is called once for each declared payload, in manifest order,
/// only after the complete manifest passes the independently selected policy.
/// Each reader must start at byte zero. Retrieval, authentication and transport
/// errors belong to the provider; no source kinds are enumerated here.
///
/// This proof covers those logical streams, not the inventory of an underlying
/// directory or archive, and does not publish or persist any payload.
pub fn verify_bundle_from<R: Read>(
    manifest: &DatasetArtifactManifestV1,
    policy: &DatasetPolicy,
    mut open: impl FnMut(&PayloadEntry) -> Result<R, AcquisitionError>,
) -> Result<VerifiedBundle, AcquisitionError> {
    verify_bundle_entries(manifest, policy, |expected| {
        verify_payload(expected, &mut open(expected)?)
    })
}

fn verify_bundle_entries(
    manifest: &DatasetArtifactManifestV1,
    policy: &DatasetPolicy,
    mut verify: impl FnMut(&PayloadEntry) -> Result<VerifiedPayload, AcquisitionError>,
) -> Result<VerifiedBundle, AcquisitionError> {
    policy.validate_manifest(manifest)?;
    let mut files = Vec::with_capacity(manifest.payload.len());
    let mut total_bytes = 0_u64;
    for expected in &manifest.payload {
        let verified = verify(expected)?;
        total_bytes = total_bytes
            .checked_add(verified.bytes)
            .ok_or(AcquisitionError::Size)?;
        files.push(verified);
    }
    // The proof reports bytes observed now. Read-only consumer mounts and a
    // later replay verification are still needed; it is not a future-write seal.
    Ok(VerifiedBundle {
        artifact_id: artifact_id(manifest)?.as_hex().into(),
        evidence_kind: policy.evidence_kind().into(),
        files,
        total_bytes,
    })
}

/// Copy and reverify a complete bundle before same-parent promotion. This
/// implements the algorithm tested here, not the later real mount deployment.
/// `parent` must be a caller-authorized private directory under a single writer.
pub fn publish_bundle(
    manifest: &DatasetArtifactManifestV1,
    source_payload: &Path,
    parent: &Path,
    policy: &DatasetPolicy,
) -> Result<VerifiedBundle, AcquisitionError> {
    let proof = verify_bundle(manifest, source_payload, policy)?;
    let root = Directory::open(parent)?;
    let _lock = root.lock()?;
    let digest = proof.artifact_id();
    if let Ok(existing) = root.child(digest) {
        let mut saved = existing.file("artifact-manifest.json", false, false)?;
        let mut bytes = Vec::new();
        Read::by_ref(&mut saved)
            .take(1_048_577)
            .read_to_end(&mut bytes)
            .map_err(|_| AcquisitionError::Io)?;
        if bytes != canonical_manifest_bytes(manifest)? {
            return Err(AcquisitionError::AlreadyPublished);
        }
        return verify_bundle(manifest, &parent.join(digest).join("payload"), policy);
    }
    match fs::statat(&root.fd, digest, fs::AtFlags::SYMLINK_NOFOLLOW) {
        Ok(_) => return Err(AcquisitionError::AlreadyPublished),
        Err(rustix::io::Errno::NOENT) => (),
        Err(_) => return Err(AcquisitionError::Io),
    }
    let source = Directory::open(source_payload)?;
    // The storage adapter acquires its own guard and exclusively creates its
    // stage. Keep this path-based entry point for existing local-cache callers;
    // content admission and publication use the same extensible interfaces.
    drop(_lock);
    persist_bundle_from(
        manifest,
        policy,
        |expected| source.payload_file(&expected.path),
        &mut FilesystemAssetStore::new(parent),
    )
}

pub fn replay_bundle(
    manifest: &DatasetArtifactManifestV1,
    selected_artifact_id: &str,
    entry_root: &Path,
    policy: &DatasetPolicy,
) -> Result<VerifiedBundle, AcquisitionError> {
    let expected = artifact_id(manifest)?;
    if selected_artifact_id != expected.as_hex()
        || entry_root.file_name().and_then(|name| name.to_str()) != Some(selected_artifact_id)
    {
        return Err(AcquisitionError::Policy);
    }
    let directory = Directory::open(entry_root)?;
    let mut file = directory.file("artifact-manifest.json", false, false)?;
    let mut bytes = Vec::new();
    Read::by_ref(&mut file)
        .take(1_048_577)
        .read_to_end(&mut bytes)
        .map_err(|_| AcquisitionError::Io)?;
    if bytes != canonical_manifest_bytes(manifest)? {
        return Err(AcquisitionError::NonCanonical);
    }
    verify_bundle(manifest, &entry_root.join("payload"), policy)
}
