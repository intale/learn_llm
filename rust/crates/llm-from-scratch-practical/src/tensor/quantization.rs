//! Symmetric four-bit weight storage; execution still uses ordinary f64 tensors.

use super::storage::{Tensor, TensorError, checked_row_major_layout};
use std::{error::Error, fmt};

#[derive(Debug)]
pub enum QuantizationError {
    Layout(TensorError),
    Shape,
    GroupSize,
    Scale,
    NonFinite,
    PayloadLength,
    ScaleCount,
    ReservedCode,
    Padding,
}

impl fmt::Display for QuantizationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Layout(_) => "quantized matrix layout overflows",
            Self::Shape => "quantization requires a nonempty rank-two matrix",
            Self::GroupSize => "quantization group size must be positive",
            Self::Scale => "quantization scale must be finite, positive and representable",
            Self::NonFinite => "quantization source or reconstruction is nonfinite",
            Self::PayloadLength => "packed code length does not match the logical matrix",
            Self::ScaleCount => "scale count does not match the row groups",
            Self::ReservedCode => "four-bit code -8 is reserved",
            Self::Padding => "unused high nibble must be zero",
        })
    }
}

impl Error for QuantizationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Layout(error) => Some(error),
            _ => None,
        }
    }
}

// region:symmetric-i4-code
/// Quantize with an already chosen scale. Halfway values round away from zero.
/// A finite input whose ratio overflows still saturates to the appropriate end.
pub fn symmetric_i4_code(value: f64, scale: f64) -> Result<i8, QuantizationError> {
    if !value.is_finite() {
        return Err(QuantizationError::NonFinite);
    }
    if !scale.is_finite() || scale <= 0.0 {
        return Err(QuantizationError::Scale);
    }
    Ok((value / scale).round().clamp(-7.0, 7.0) as i8)
}
// endregion:symmetric-i4-code

/// Scales are row-local; the code stream is row-major, low nibble first.
#[derive(Clone, Debug, PartialEq)]
pub struct GroupedI4Matrix {
    shape: [usize; 2],
    group_size: usize,
    packed: Vec<u8>,
    scales: Vec<f64>,
}

fn layout(shape: [usize; 2], group_size: usize) -> Result<(usize, usize), QuantizationError> {
    if shape.contains(&0) {
        return Err(QuantizationError::Shape);
    }
    if group_size == 0 {
        return Err(QuantizationError::GroupSize);
    }
    let (_, count) = checked_row_major_layout(&shape).map_err(QuantizationError::Layout)?;
    let groups = shape[0] * shape[1].div_ceil(group_size);
    Ok((count, groups))
}

impl GroupedI4Matrix {
    // region:grouped-i4-quantize
    pub fn quantize(matrix: &Tensor, group_size: usize) -> Result<Self, QuantizationError> {
        let shape: [usize; 2] = matrix
            .shape()
            .try_into()
            .map_err(|_| QuantizationError::Shape)?;
        let (count, groups) = layout(shape, group_size)?;
        let mut packed = vec![0; count.div_ceil(2)];
        let mut scales = Vec::with_capacity(groups);
        let mut index = 0;
        for row in matrix.as_slice().chunks_exact(shape[1]) {
            for group in row.chunks(group_size) {
                if group.iter().any(|value| !value.is_finite()) {
                    return Err(QuantizationError::NonFinite);
                }
                let maximum = group.iter().map(|value| value.abs()).fold(0.0, f64::max);
                let scale = if maximum == 0.0 { 1.0 } else { maximum / 7.0 };
                for &value in group {
                    let code = symmetric_i4_code(value, scale)?;
                    packed[index / 2] |= ((code as u8) & 0x0f) << (4 * (index % 2));
                    index += 1;
                }
                scales.push(scale);
            }
        }
        Self::from_parts(shape, group_size, packed, scales)
    }
    // endregion:grouped-i4-quantize

    // region:grouped-i4-validation
    pub fn from_parts(
        shape: [usize; 2],
        group_size: usize,
        packed: Vec<u8>,
        scales: Vec<f64>,
    ) -> Result<Self, QuantizationError> {
        let (count, groups) = layout(shape, group_size)?;
        if packed.len() != count.div_ceil(2) {
            return Err(QuantizationError::PayloadLength);
        }
        if scales.len() != groups {
            return Err(QuantizationError::ScaleCount);
        }
        if scales.iter().any(|s| !s.is_finite() || *s <= 0.0) {
            return Err(QuantizationError::Scale);
        }
        if count % 2 == 1 && packed.last().unwrap() & 0xf0 != 0 {
            return Err(QuantizationError::Padding);
        }
        let result = Self {
            shape,
            group_size,
            packed,
            scales,
        };
        for index in 0..count {
            if result.code(index) == -8 {
                return Err(QuantizationError::ReservedCode);
            }
            if !result.value(index).is_finite() {
                return Err(QuantizationError::NonFinite);
            }
        }
        Ok(result)
    }
    // endregion:grouped-i4-validation

    fn code(&self, index: usize) -> i8 {
        let nibble = ((self.packed[index / 2] >> (4 * (index % 2))) & 0x0f) as i8;
        if nibble >= 8 { nibble - 16 } else { nibble }
    }

    fn value(&self, index: usize) -> f64 {
        let row = index / self.shape[1];
        let column = index % self.shape[1];
        let group = row * self.shape[1].div_ceil(self.group_size) + column / self.group_size;
        f64::from(self.code(index)) * self.scales[group]
    }

    // region:grouped-i4-dequantize
    /// Reconstruct the logical matrix for the existing floating-point operations.
    pub fn dequantize(&self) -> Result<Tensor, QuantizationError> {
        let count = self.shape[0] * self.shape[1];
        Tensor::from_vec(
            self.shape.to_vec(),
            (0..count).map(|i| self.value(i)).collect(),
        )
        .map_err(QuantizationError::Layout)
    }
    // endregion:grouped-i4-dequantize

    pub const fn shape(&self) -> [usize; 2] {
        self.shape
    }
    pub const fn group_size(&self) -> usize {
        self.group_size
    }
    pub fn packed(&self) -> &[u8] {
        &self.packed
    }
    pub fn scales(&self) -> &[f64] {
        &self.scales
    }
    pub fn codes(&self) -> Vec<i8> {
        (0..self.shape[0] * self.shape[1])
            .map(|i| self.code(i))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ties_clipping_and_ratio_overflow_have_explicit_results() {
        for (value, expected) in [(-10.0, -7), (-0.5, -1), (0.5, 1), (10.0, 7)] {
            assert_eq!(symmetric_i4_code(value, 1.0).unwrap(), expected);
        }
        assert_eq!(symmetric_i4_code(f64::MAX, f64::MIN_POSITIVE).unwrap(), 7);
        for scale in [0.0, -1.0, f64::INFINITY, f64::NAN] {
            assert!(symmetric_i4_code(0.0, scale).is_err());
        }
    }

    #[test]
    fn hand_matrix_codes_bytes_and_reconstruction_match() {
        let source =
            Tensor::from_vec(vec![2, 4], vec![-7.0, -3.5, 0.0, 3.5, 0.1, 0.2, 0.3, 7.0]).unwrap();
        let quantized = GroupedI4Matrix::quantize(&source, 4).unwrap();
        assert_eq!(quantized.scales(), [1.0, 1.0]);
        assert_eq!(quantized.codes(), [-7, -4, 0, 4, 0, 0, 0, 7]);
        assert_eq!(quantized.packed(), [0xc9, 0x40, 0x00, 0x70]);
        assert_eq!(
            quantized.dequantize().unwrap().as_slice(),
            [-7.0, -4.0, 0.0, 4.0, 0.0, 0.0, 0.0, 7.0]
        );
        let finer = GroupedI4Matrix::quantize(&source, 2).unwrap();
        assert_eq!(finer.scales(), [1.0, 0.5, 0.2 / 7.0, 1.0]);
        assert_eq!(finer.codes(), [-7, -4, 0, 7, 4, 7, 0, 7]);
        assert_eq!(finer.packed(), [0xc9, 0x70, 0x74, 0x70]);
    }

    #[test]
    fn zero_groups_tails_and_packing_across_rows() {
        let source = Tensor::from_vec(vec![1, 5], vec![-7.0, -3.5, 0.0, 3.5, 7.0]).unwrap();
        let result = GroupedI4Matrix::quantize(&source, 4).unwrap();
        assert_eq!(result.packed(), [0xc9, 0x40, 0x07]);
        assert_eq!(result.scales(), [1.0, 1.0]);
        let zeros = Tensor::from_vec(vec![2, 3], vec![0.0; 6]).unwrap();
        let result = GroupedI4Matrix::quantize(&zeros, 2).unwrap();
        assert_eq!(result.scales(), [1.0; 4]);
        assert_eq!(result.packed(), [0; 3]);
        // Each row's tail has its own scale even when a byte holds two rows.
        let rows = GroupedI4Matrix::from_parts(
            [2, 3],
            2,
            vec![0x21, 0x43, 0x65],
            vec![1.0, 2.0, 3.0, 4.0],
        )
        .unwrap();
        assert_eq!(
            rows.dequantize().unwrap().as_slice(),
            [1.0, 2.0, 6.0, 12.0, 15.0, 24.0]
        );
    }

    #[test]
    fn invalid_encodings_and_unrepresentable_fits_are_rejected() {
        assert!(matches!(
            GroupedI4Matrix::from_parts([1, 1], 1, vec![], vec![1.0]),
            Err(QuantizationError::PayloadLength)
        ));
        assert!(matches!(
            GroupedI4Matrix::from_parts([1, 1], 1, vec![0], vec![]),
            Err(QuantizationError::ScaleCount)
        ));
        assert!(matches!(
            GroupedI4Matrix::from_parts([1, 1], 1, vec![8], vec![1.0]),
            Err(QuantizationError::ReservedCode)
        ));
        assert!(matches!(
            GroupedI4Matrix::from_parts([1, 1], 1, vec![0x10], vec![1.0]),
            Err(QuantizationError::Padding)
        ));
        assert!(GroupedI4Matrix::from_parts([1, 1], 1, vec![7], vec![f64::MAX]).is_err());
        assert!(GroupedI4Matrix::from_parts([1, 1], 1, vec![0], vec![f64::NAN]).is_err());
        assert!(GroupedI4Matrix::from_parts([usize::MAX, 2], 1, vec![], vec![]).is_err());
        for value in [f64::NAN, f64::INFINITY, f64::from_bits(1)] {
            let source = Tensor::from_vec(vec![1, 1], vec![value]).unwrap();
            assert!(GroupedI4Matrix::quantize(&source, 1).is_err());
        }
        let empty = Tensor::from_vec(vec![0, 1], vec![]).unwrap();
        assert!(GroupedI4Matrix::quantize(&empty, 1).is_err());
        let scalar = Tensor::from_vec(vec![1], vec![1.0]).unwrap();
        assert!(GroupedI4Matrix::quantize(&scalar, 1).is_err());
        assert!(GroupedI4Matrix::from_parts([1, 1], 0, vec![0], vec![1.0]).is_err());
    }
}
