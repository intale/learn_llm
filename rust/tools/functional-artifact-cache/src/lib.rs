//! Operational adapters. Filesystem layout and transport do not belong to the
//! course's content-verification contract.
pub mod artifact {
    pub mod acquisition;
    pub mod canonical_manifest;
    pub mod inventory;
    pub mod lineage;
}
pub mod filesystem;
