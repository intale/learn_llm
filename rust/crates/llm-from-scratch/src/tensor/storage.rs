//! Contiguous row-major tensor storage and checked coordinate lookup.

use std::error::Error;
use std::fmt;

/// A tensor whose logical dimensions map onto one contiguous value buffer.
#[derive(Clone, Debug, PartialEq)]
pub struct Tensor {
    data: Vec<f64>,
    shape: Vec<usize>,
    strides: Vec<usize>,
}

/// A rejected tensor layout, buffer, or coordinate.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TensorError {
    /// A suffix product needed by the row-major layout exceeds `usize`.
    ShapeOverflow,
    /// The flat buffer length differs from the shape's element count.
    DataLengthMismatch { expected: usize, actual: usize },
    /// A coordinate supplies a different number of axes from the tensor.
    RankMismatch { expected: usize, actual: usize },
    /// One coordinate index lies outside its axis.
    IndexOutOfBounds {
        axis: usize,
        index: usize,
        dimension: usize,
    },
}

impl fmt::Display for TensorError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ShapeOverflow => {
                formatter.write_str("shape does not fit a row-major usize layout")
            }
            Self::DataLengthMismatch { expected, actual } => write!(
                formatter,
                "shape needs {expected} values, but data has {actual}"
            ),
            Self::RankMismatch { expected, actual } => write!(
                formatter,
                "coordinate rank {actual} does not match tensor rank {expected}"
            ),
            Self::IndexOutOfBounds {
                axis,
                index,
                dimension,
            } => write!(
                formatter,
                "index {index} is out of bounds for axis {axis} with size {dimension}"
            ),
        }
    }
}

impl Error for TensorError {}

// region:tensor-storage-invariants
pub(crate) fn checked_row_major_layout(
    shape: &[usize],
) -> Result<(Vec<usize>, usize), TensorError> {
    if shape.is_empty() {
        return Ok((Vec::new(), 1));
    }

    let mut strides = vec![1; shape.len()];
    for axis in (0..shape.len() - 1).rev() {
        strides[axis] = shape[axis + 1]
            .checked_mul(strides[axis + 1])
            .ok_or(TensorError::ShapeOverflow)?;
    }

    let element_count = shape[0]
        .checked_mul(strides[0])
        .ok_or(TensorError::ShapeOverflow)?;
    Ok((strides, element_count))
}

pub(crate) fn checked_offset(
    shape: &[usize],
    strides: &[usize],
    base_offset: usize,
    coordinate: &[usize],
) -> Result<usize, TensorError> {
    debug_assert_eq!(shape.len(), strides.len());

    if coordinate.len() != shape.len() {
        return Err(TensorError::RankMismatch {
            expected: shape.len(),
            actual: coordinate.len(),
        });
    }

    let mut offset = base_offset;
    for (axis, ((&index, &dimension), &stride)) in
        coordinate.iter().zip(shape).zip(strides).enumerate()
    {
        if index >= dimension {
            return Err(TensorError::IndexOutOfBounds {
                axis,
                index,
                dimension,
            });
        }
        let contribution = index
            .checked_mul(stride)
            .ok_or(TensorError::ShapeOverflow)?;
        offset = offset
            .checked_add(contribution)
            .ok_or(TensorError::ShapeOverflow)?;
    }
    Ok(offset)
}

impl Tensor {
    /// Builds a tensor after checking its row-major layout and buffer length.
    pub fn from_vec(shape: Vec<usize>, data: Vec<f64>) -> Result<Self, TensorError> {
        let (strides, expected) = checked_row_major_layout(&shape)?;
        let actual = data.len();
        if actual != expected {
            return Err(TensorError::DataLengthMismatch { expected, actual });
        }

        Ok(Self {
            data,
            shape,
            strides,
        })
    }

    /// Returns the number of logical axes.
    pub fn rank(&self) -> usize {
        self.shape.len()
    }

    /// Returns the extent of every axis.
    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    /// Returns the row-major suffix-product stride for every axis.
    pub fn strides(&self) -> &[usize] {
        &self.strides
    }

    /// Returns the number of stored values.
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Reports whether the flat buffer stores no values.
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Borrows the contiguous value buffer.
    pub fn as_slice(&self) -> &[f64] {
        &self.data
    }

    /// Mutably borrows the contiguous value buffer without changing its length.
    pub fn as_mut_slice(&mut self) -> &mut [f64] {
        &mut self.data
    }

    /// Consumes the tensor and returns its contiguous value buffer.
    pub fn into_vec(self) -> Vec<f64> {
        self.data
    }
    // endregion:tensor-storage-invariants

    // region:row-major-indexing
    /// Maps one in-bounds coordinate to its row-major flat-buffer offset.
    pub fn offset(&self, coordinate: &[usize]) -> Result<usize, TensorError> {
        checked_offset(&self.shape, &self.strides, 0, coordinate)
    }

    /// Borrows the value at one checked coordinate.
    pub fn get(&self, coordinate: &[usize]) -> Result<&f64, TensorError> {
        let offset = self.offset(coordinate)?;
        Ok(&self.data[offset])
    }

    /// Mutably borrows the value at one checked coordinate.
    pub fn get_mut(&mut self, coordinate: &[usize]) -> Result<&mut f64, TensorError> {
        let offset = self.offset(coordinate)?;
        Ok(&mut self.data[offset])
    }
    // endregion:row-major-indexing
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tiny_tensor() -> Tensor {
        Tensor::from_vec(
            vec![2, 2, 3],
            vec![
                10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0,
            ],
        )
        .unwrap()
    }

    #[test]
    fn from_vec_freezes_contiguous_row_major_metadata() {
        let tensor = tiny_tensor();

        assert_eq!(tensor.rank(), 3);
        assert_eq!(tensor.shape(), [2, 2, 3]);
        assert_eq!(tensor.strides(), [6, 3, 1]);
        assert_eq!(tensor.len(), 12);
        assert!(!tensor.is_empty());
        assert_eq!(tensor.as_slice().first(), Some(&10.0));
        assert_eq!(tensor.as_slice().last(), Some(&42.0));
    }

    #[test]
    fn row_major_offsets_cover_every_value_once() {
        let tensor = tiny_tensor();
        let mut offsets = Vec::new();

        for axis0 in 0..2 {
            for axis1 in 0..2 {
                for axis2 in 0..3 {
                    let coordinate = [axis0, axis1, axis2];
                    let offset = tensor.offset(&coordinate).unwrap();
                    offsets.push(offset);
                    assert_eq!(tensor.get(&coordinate), Ok(&tensor.as_slice()[offset]));
                }
            }
        }

        assert_eq!(offsets, (0..12).collect::<Vec<_>>());
        assert_eq!(tensor.offset(&[1, 0, 2]), Ok(8));
        assert_eq!(tensor.get(&[1, 0, 2]), Ok(&32.0));
    }

    #[test]
    fn mutable_access_cannot_change_layout_invariants() {
        let mut tensor = tiny_tensor();

        *tensor.get_mut(&[0, 1, 1]).unwrap() = 99.0;
        tensor.as_mut_slice()[0] = -10.0;

        assert_eq!(tensor.get(&[0, 1, 1]), Ok(&99.0));
        assert_eq!(tensor.get(&[0, 0, 0]), Ok(&-10.0));
        assert_eq!(tensor.shape(), [2, 2, 3]);
        assert_eq!(tensor.strides(), [6, 3, 1]);
        assert_eq!(tensor.len(), 12);
    }

    #[test]
    fn into_vec_returns_values_in_flat_order() {
        let values = tiny_tensor().into_vec();

        assert_eq!(
            values,
            [
                10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0, 40.0, 41.0, 42.0,
            ]
        );
    }

    #[test]
    fn storage_preserves_arbitrary_f64_bit_patterns() {
        let values = vec![
            1.5,
            f64::INFINITY,
            -0.0,
            f64::from_bits(0x7ff8_0000_0000_0042),
        ];
        let expected_bits = values
            .iter()
            .map(|value| value.to_bits())
            .collect::<Vec<_>>();

        let actual_bits = Tensor::from_vec(vec![2, 2], values)
            .unwrap()
            .into_vec()
            .into_iter()
            .map(f64::to_bits)
            .collect::<Vec<_>>();

        assert_eq!(actual_bits, expected_bits);
    }

    #[test]
    fn rank_zero_is_one_scalar_value() {
        let tensor = Tensor::from_vec(vec![], vec![7.0]).unwrap();

        assert_eq!(tensor.rank(), 0);
        assert_eq!(tensor.shape(), []);
        assert_eq!(tensor.strides(), []);
        assert_eq!(tensor.len(), 1);
        assert_eq!(tensor.offset(&[]), Ok(0));
        assert_eq!(tensor.get(&[]), Ok(&7.0));
    }

    #[test]
    fn rank_n_has_no_hard_coded_axis_limit() {
        let shape = vec![1; 64];
        let coordinate = vec![0; 64];
        let tensor = Tensor::from_vec(shape.clone(), vec![5.0]).unwrap();

        assert_eq!(tensor.rank(), 64);
        assert_eq!(tensor.shape(), shape.as_slice());
        assert_eq!(tensor.strides(), &[1; 64]);
        assert_eq!(tensor.offset(&coordinate), Ok(0));
        assert_eq!(tensor.get(&coordinate), Ok(&5.0));
    }

    #[test]
    fn zero_extent_layout_is_valid_and_empty() {
        let tensor = Tensor::from_vec(vec![2, 0, 3], vec![]).unwrap();

        assert_eq!(tensor.strides(), [0, 3, 1]);
        assert_eq!(tensor.len(), 0);
        assert!(tensor.is_empty());
        assert_eq!(
            tensor.offset(&[0, 0, 0]),
            Err(TensorError::IndexOutOfBounds {
                axis: 1,
                index: 0,
                dimension: 0,
            })
        );
    }

    #[test]
    fn data_length_must_equal_shape_product() {
        assert_eq!(
            Tensor::from_vec(vec![2, 3], vec![0.0; 5]),
            Err(TensorError::DataLengthMismatch {
                expected: 6,
                actual: 5,
            })
        );
        assert_eq!(
            Tensor::from_vec(vec![2, 3], vec![0.0; 7]),
            Err(TensorError::DataLengthMismatch {
                expected: 6,
                actual: 7,
            })
        );
        assert_eq!(
            Tensor::from_vec(vec![], vec![]),
            Err(TensorError::DataLengthMismatch {
                expected: 1,
                actual: 0,
            })
        );
        assert_eq!(
            Tensor::from_vec(vec![0], vec![1.0]),
            Err(TensorError::DataLengthMismatch {
                expected: 0,
                actual: 1,
            })
        );
    }

    #[test]
    fn overflowing_shape_and_suffix_are_rejected_before_length() {
        assert_eq!(
            Tensor::from_vec(vec![usize::MAX, 2], vec![]),
            Err(TensorError::ShapeOverflow)
        );
        assert_eq!(
            Tensor::from_vec(vec![0, usize::MAX, 2], vec![]),
            Err(TensorError::ShapeOverflow)
        );
    }

    #[test]
    fn rank_is_validated_before_any_axis() {
        let tensor = tiny_tensor();

        assert_eq!(
            tensor.offset(&[usize::MAX]),
            Err(TensorError::RankMismatch {
                expected: 3,
                actual: 1,
            })
        );
        assert_eq!(
            tensor.offset(&[0, 0, 0, 0]),
            Err(TensorError::RankMismatch {
                expected: 3,
                actual: 4,
            })
        );
    }

    #[test]
    fn bounds_are_validated_in_axis_order() {
        let tensor = tiny_tensor();

        assert_eq!(
            tensor.offset(&[2, 2, 3]),
            Err(TensorError::IndexOutOfBounds {
                axis: 0,
                index: 2,
                dimension: 2,
            })
        );
        assert_eq!(
            tensor.offset(&[1, 2, 0]),
            Err(TensorError::IndexOutOfBounds {
                axis: 1,
                index: 2,
                dimension: 2,
            })
        );
        assert_eq!(
            tensor.offset(&[1, 1, 3]),
            Err(TensorError::IndexOutOfBounds {
                axis: 2,
                index: 3,
                dimension: 3,
            })
        );
    }

    #[test]
    fn error_messages_explain_the_rejected_invariant() {
        assert_eq!(
            TensorError::ShapeOverflow.to_string(),
            "shape does not fit a row-major usize layout"
        );
        assert_eq!(
            TensorError::DataLengthMismatch {
                expected: 6,
                actual: 5,
            }
            .to_string(),
            "shape needs 6 values, but data has 5"
        );
        assert_eq!(
            TensorError::RankMismatch {
                expected: 3,
                actual: 2,
            }
            .to_string(),
            "coordinate rank 2 does not match tensor rank 3"
        );
        assert_eq!(
            TensorError::IndexOutOfBounds {
                axis: 1,
                index: 2,
                dimension: 2,
            }
            .to_string(),
            "index 2 is out of bounds for axis 1 with size 2"
        );
    }
}
