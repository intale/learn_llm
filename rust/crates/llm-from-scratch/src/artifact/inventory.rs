// Bounded streaming verification and descriptor-relative filesystem plumbing.
// Rustix supplies safe OS operations; course checks decide which objects count.

use std::collections::BTreeSet;
use std::fs::File;
use std::io::{Read, Write};
use std::os::fd::OwnedFd;
use std::path::{Component, Path};

use rustix::fs::{self, Dir, FileType, Mode, OFlags};
use sha2::{Digest, Sha256};

use super::canonical_manifest::{
    DatasetArtifactManifestV1, PayloadEntry, STREAM_BUFFER_BYTES, artifact_id,
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
    let mut bytes = Vec::new();
    Read::by_ref(&mut file)
        .take(1_048_577)
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
    let mut files = Vec::with_capacity(4);
    let mut total_bytes = 0_u64;
    for expected in &manifest.payload {
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
    // mkdir is exclusive: an interrupted candidate is preserved for explicit
    // recovery rather than reused merely because its pathname exists.
    let temporary_name = format!("pending-{digest}");
    let entry = root.create_child(&temporary_name)?;
    let payload = entry.create_child("payload")?;
    let raw = payload.create_child("raw")?;
    let provenance = payload.create_child("provenance")?;
    let source = Directory::open(source_payload)?;
    for expected in &manifest.payload {
        let (directory_name, filename) = expected
            .path
            .split_once('/')
            .ok_or(AcquisitionError::UnsafePath)?;
        let destination = match directory_name {
            "raw" => &raw,
            "provenance" => &provenance,
            _ => return Err(AcquisitionError::UnsafePath),
        };
        let mut input = source.payload_file(&expected.path)?;
        let mut output = destination.file(filename, true, true)?;
        let copied = std::io::copy(
            &mut Read::by_ref(&mut input).take(expected.bytes + 1),
            &mut output,
        )
        .map_err(|_| AcquisitionError::Io)?;
        if copied != expected.bytes {
            return Err(AcquisitionError::Size);
        }
        output.sync_all().map_err(|_| AcquisitionError::Io)?;
    }
    raw.sync()?;
    provenance.sync()?;
    payload.sync()?;
    let mut manifest_file = entry.file("artifact-manifest.json", true, true)?;
    manifest_file
        .write_all(&canonical_manifest_bytes(manifest)?)
        .map_err(|_| AcquisitionError::Io)?;
    manifest_file.sync_all().map_err(|_| AcquisitionError::Io)?;
    entry.sync()?;
    let copied = verify_bundle(
        manifest,
        &parent.join(&temporary_name).join("payload"),
        policy,
    )?;
    // Caller/lock owns this parent; refuse any existing target, including a
    // symlink or corrupt directory, instead of overwriting it by rename.
    if fs::statat(&root.fd, digest, fs::AtFlags::SYMLINK_NOFOLLOW).is_ok() {
        return Err(AcquisitionError::AlreadyPublished);
    }
    root.rename(&temporary_name, digest)?;
    Ok(copied)
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
