//! Lossy weight storage in the existing named SafeTensors model container.

use super::portable::{ArchiveResult, NamedData, PortableModel, integer, text};
use crate::tensor::{quantization::GroupedI4Matrix, storage::Tensor};
use safetensors::Dtype;

pub const I4_SCHEME: &str = "symmetric-i4-rowwise-v1";
const SCALES: &str = "quantization.scales.";
const SHAPES: &str = "quantization.shape.";

/// Logical payload counts, excluding file headers and configuration metadata.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct WeightStorage {
    pub matrices: usize,
    pub matrix_values: usize,
    pub weight_bytes: usize,
    pub scale_bytes: usize,
    pub shape_bytes: usize,
    pub unchanged_bytes: usize,
}

impl WeightStorage {
    pub const fn payload_bytes(self) -> usize {
        self.weight_bytes + self.scale_bytes + self.shape_bytes + self.unchanged_bytes
    }
}

impl PortableModel {
    pub fn quantization_group_size(&self) -> ArchiveResult<Option<usize>> {
        match (
            self.settings.get("quantization.scheme"),
            self.settings.get("quantization.group_size"),
        ) {
            (None, None) => Ok(None),
            (Some(_), Some(_)) => {
                let group_size = integer(&self.settings, "quantization.group_size")?;
                if text(&self.settings, "quantization.scheme")? != I4_SCHEME || group_size == 0 {
                    return Err("unsupported weight quantization scheme or group size".into());
                }
                Ok(Some(group_size))
            }
            _ => Err("incomplete weight quantization settings".into()),
        }
    }

    // region:portable-weight-quantization
    /// Derive a lossy inference archive; leave the source model unchanged.
    pub fn quantize_weights(&self, group_size: usize) -> ArchiveResult<Self> {
        self.validate()?;
        if self.quantization_group_size()?.is_some() {
            return Err("weights are already quantized; select an unquantized source".into());
        }
        if group_size == 0 {
            return Err("quantization group size must be positive".into());
        }
        let mut result = Self {
            settings: config_lib::Config::from_string(&self.configuration()?, Some("conf"))?,
            tensors: self.tensors.clone(),
        };
        for parameter in self.parameters()? {
            let matrix = parameter.tensor().value();
            if matrix.shape().len() != 2 {
                continue;
            }
            let name = parameter.name();
            let quantized = GroupedI4Matrix::quantize(&matrix, group_size)?;
            result.tensors.insert(
                name.into(),
                NamedData {
                    dtype: Dtype::U8,
                    shape: vec![quantized.packed().len()],
                    bytes: quantized.packed().to_vec(),
                },
            );
            result.tensors.insert(
                format!("{SCALES}{name}"),
                NamedData::f64(vec![quantized.scales().len()], quantized.scales()),
            );
            result.tensors.insert(
                format!("{SHAPES}{name}"),
                NamedData::u64(&[
                    u64::try_from(matrix.shape()[0])?,
                    u64::try_from(matrix.shape()[1])?,
                ]),
            );
        }
        result.settings.set("quantization.scheme", I4_SCHEME)?;
        result
            .settings
            .set("quantization.group_size", i64::try_from(group_size)?)?;
        result.validate()?;
        Ok(result)
    }
    // endregion:portable-weight-quantization

    // region:portable-weight-dequantization
    pub(super) fn logical_parameter(
        &self,
        name: &str,
        data: &NamedData,
        group_size: Option<usize>,
    ) -> ArchiveResult<Tensor> {
        if let Some(group_size) = group_size.filter(|_| name.ends_with(".weight")) {
            let shape = self
                .tensors
                .get(&format!("{SHAPES}{name}"))
                .ok_or("missing quantized logical shape")?;
            if data.dtype != Dtype::U8 || data.shape != [data.bytes.len()] || shape.shape != [2] {
                return Err("invalid packed matrix dtype or shape".into());
            }
            let dimensions = shape.unsigned_values()?;
            if dimensions.len() != 2 {
                return Err("invalid quantized logical shape payload".into());
            }
            let scales = self
                .tensors
                .get(&format!("{SCALES}{name}"))
                .ok_or("missing quantized matrix scales")?;
            let scale_values = scales.float_values()?;
            if scales.shape != [scale_values.len()] {
                return Err("invalid quantization scale shape".into());
            }
            return Ok(GroupedI4Matrix::from_parts(
                [
                    usize::try_from(dimensions[0])?,
                    usize::try_from(dimensions[1])?,
                ],
                group_size,
                data.bytes.clone(),
                scale_values,
            )?
            .dequantize()?);
        }
        Ok(Tensor::from_vec(data.shape.clone(), data.float_values()?)?)
    }
    // endregion:portable-weight-dequantization

    /// Count the actual representation, retaining unchanged assets separately.
    pub fn weight_storage(&self) -> ArchiveResult<WeightStorage> {
        self.validate()?;
        let mut result = WeightStorage::default();
        for parameter in self.parameters()? {
            let value = parameter.tensor().value();
            if value.shape().len() == 2 {
                result.matrices += 1;
                result.matrix_values += value.len();
                result.weight_bytes += self.tensors[parameter.name()].bytes.len();
            }
        }
        for (name, data) in &self.tensors {
            if name.starts_with(SCALES) {
                result.scale_bytes += data.bytes.len();
            } else if name.starts_with(SHAPES) {
                result.shape_bytes += data.bytes.len();
            } else if !name.ends_with(".weight") {
                result.unchanged_bytes += data.bytes.len();
            }
        }
        Ok(result)
    }
}

#[cfg(test)]
#[path = "quantization_tests.rs"]
mod tests;
