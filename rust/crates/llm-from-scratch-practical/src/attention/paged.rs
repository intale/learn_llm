//! Logical token addressing for a bounded, explicitly reserved KV-page pool.

use serde::Serialize;
use std::{error::Error, fmt};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PagedKvError {
    ZeroCapacity,
    ZeroPageSize,
    PageCount {
        expected: usize,
        actual: usize,
    },
    PhysicalPage {
        logical_page: usize,
        physical_page: usize,
        pages: usize,
    },
    AliasedPage {
        physical_page: usize,
    },
    Length {
        length: usize,
        capacity: usize,
    },
    Overflow,
    AllocationFailed {
        entries: usize,
    },
}

impl fmt::Display for PagedKvError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroCapacity => formatter.write_str("paged KV capacity must be positive"),
            Self::ZeroPageSize => formatter.write_str("KV tokens per page must be positive"),
            Self::PageCount { expected, actual } => write!(
                formatter,
                "KV page table needs {expected} entries, got {actual}"
            ),
            Self::PhysicalPage {
                logical_page,
                physical_page,
                pages,
            } => write!(
                formatter,
                "logical KV page {logical_page} maps to physical page {physical_page}, outside {pages} reserved pages"
            ),
            Self::AliasedPage { physical_page } => write!(
                formatter,
                "physical KV page {physical_page} is assigned more than once"
            ),
            Self::Length { length, capacity } => write!(
                formatter,
                "KV length {length} exceeds logical capacity {capacity}"
            ),
            Self::Overflow => formatter.write_str("paged KV size or byte count overflows"),
            Self::AllocationFailed { entries } => write!(
                formatter,
                "cannot allocate {entries} KV page-table validation entries"
            ),
        }
    }
}

impl Error for PagedKvError {}

/// A permutation of reserved physical pages; it has no allocation/sharing policy.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PagedKvLayout {
    capacity: usize,
    page_tokens: usize,
    physical_tokens: usize,
    page_table: Vec<usize>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct KvPageAddress {
    pub logical_position: usize,
    pub logical_page: usize,
    pub physical_page: usize,
    pub offset_in_page: usize,
}

impl PagedKvLayout {
    // region:checked-kv-page-table
    pub fn new(
        capacity: usize,
        page_tokens: usize,
        page_table: Vec<usize>,
    ) -> Result<Self, PagedKvError> {
        if capacity == 0 {
            return Err(PagedKvError::ZeroCapacity);
        }
        if page_tokens == 0 {
            return Err(PagedKvError::ZeroPageSize);
        }
        let pages = capacity.div_ceil(page_tokens);
        let physical_tokens = pages
            .checked_mul(page_tokens)
            .ok_or(PagedKvError::Overflow)?;
        if page_table.len() != pages {
            return Err(PagedKvError::PageCount {
                expected: pages,
                actual: page_table.len(),
            });
        }
        let mut used = Vec::new();
        used.try_reserve_exact(pages)
            .map_err(|_| PagedKvError::AllocationFailed { entries: pages })?;
        used.resize(pages, false);
        for (logical_page, &physical_page) in page_table.iter().enumerate() {
            if physical_page >= pages {
                return Err(PagedKvError::PhysicalPage {
                    logical_page,
                    physical_page,
                    pages,
                });
            }
            if used[physical_page] {
                return Err(PagedKvError::AliasedPage { physical_page });
            }
            used[physical_page] = true;
        }
        Ok(Self {
            capacity,
            page_tokens,
            physical_tokens,
            page_table,
        })
    }
    // endregion:checked-kv-page-table

    // region:logical-to-physical-kv-page
    pub fn address(&self, logical_position: usize) -> Option<KvPageAddress> {
        if logical_position >= self.capacity {
            return None;
        }
        let logical_page = logical_position / self.page_tokens;
        Some(KvPageAddress {
            logical_position,
            logical_page,
            physical_page: self.page_table[logical_page],
            offset_in_page: logical_position % self.page_tokens,
        })
    }

    /// The caller has checked lane, feature width and total buffer size.
    pub(crate) fn row_start(
        &self,
        lane: usize,
        lanes: usize,
        width: usize,
        position: usize,
    ) -> usize {
        let address = self.address(position).expect("checked logical KV position");
        ((address.physical_page * lanes + lane) * self.page_tokens + address.offset_in_page) * width
    }
    // endregion:logical-to-physical-kv-page

    pub const fn capacity(&self) -> usize {
        self.capacity
    }
    pub const fn page_tokens(&self) -> usize {
        self.page_tokens
    }
    pub const fn physical_tokens(&self) -> usize {
        self.physical_tokens
    }
    pub fn page_table(&self) -> &[usize] {
        &self.page_table
    }

    // region:paged-kv-payload-accounting
    /// Counts K and V f64 buffer elements, excluding metadata and other allocations.
    pub fn payload(
        &self,
        length: usize,
        batch: usize,
        kv_heads: usize,
        width: usize,
    ) -> Result<PagedKvPayload, PagedKvError> {
        if length > self.capacity {
            return Err(PagedKvError::Length {
                length,
                capacity: self.capacity,
            });
        }
        let per_position = 2_usize
            .checked_mul(batch)
            .and_then(|n| n.checked_mul(kv_heads))
            .and_then(|n| n.checked_mul(width))
            .ok_or(PagedKvError::Overflow)?;
        let active_pages = length.div_ceil(self.page_tokens);
        let active_positions = active_pages
            .checked_mul(self.page_tokens)
            .ok_or(PagedKvError::Overflow)?;
        let count = |positions: usize| {
            per_position
                .checked_mul(positions)
                .ok_or(PagedKvError::Overflow)
        };
        let allocated_scalar_slots = count(self.physical_tokens)?;
        let live_scalar_slots = count(length)?;
        let active_page_tail_scalar_slots = count(active_positions - length)?;
        let inactive_page_scalar_slots = count(self.physical_tokens - active_positions)?;
        let bytes = |slots: usize| {
            slots
                .checked_mul(std::mem::size_of::<f64>())
                .ok_or(PagedKvError::Overflow)
        };
        Ok(PagedKvPayload {
            reserved_pages: self.page_table.len(),
            active_pages,
            allocated_scalar_slots,
            live_scalar_slots,
            unused_scalar_slots: allocated_scalar_slots - live_scalar_slots,
            active_page_tail_scalar_slots,
            inactive_page_scalar_slots,
            allocated_payload_bytes: bytes(allocated_scalar_slots)?,
            live_payload_bytes: bytes(live_scalar_slots)?,
            unused_payload_bytes: bytes(allocated_scalar_slots - live_scalar_slots)?,
            active_page_tail_payload_bytes: bytes(active_page_tail_scalar_slots)?,
            inactive_page_payload_bytes: bytes(inactive_page_scalar_slots)?,
        })
    }
    // endregion:paged-kv-payload-accounting
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct PagedKvPayload {
    pub reserved_pages: usize,
    pub active_pages: usize,
    pub allocated_scalar_slots: usize,
    pub live_scalar_slots: usize,
    pub unused_scalar_slots: usize,
    pub active_page_tail_scalar_slots: usize,
    pub inactive_page_scalar_slots: usize,
    pub allocated_payload_bytes: usize,
    pub live_payload_bytes: usize,
    pub unused_payload_bytes: usize,
    pub active_page_tail_payload_bytes: usize,
    pub inactive_page_payload_bytes: usize,
}

#[cfg(test)]
#[path = "paged_tests.rs"]
mod tests;
