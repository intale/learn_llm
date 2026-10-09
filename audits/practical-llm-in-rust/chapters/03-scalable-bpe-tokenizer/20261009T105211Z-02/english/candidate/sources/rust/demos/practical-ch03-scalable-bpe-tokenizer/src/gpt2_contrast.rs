//! Chapter-local published GPT-2 byte-map and pretokenization policy.
//! The frozen-rank engine is the existing practical-course BpeTokenizer.
//! This tiny course-authored vocabulary supplies no pretrained GPT-2 IDs.
//! Source: openai/gpt-2 encoder.py e5c5054474f583d6d9499624649353995d63c70a.

use fancy_regex::Regex;
use llm_from_scratch_practical::tokenizer::bpe::BpeTokenizer;
use llm_from_scratch_practical::tokenizer::bpe_trainer::TokenPair;
use std::collections::BTreeMap;

const PATTERN: &str = r"'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+";

pub struct Gpt2PolicyExample {
    bytes: [char; 256],
    reverse_bytes: BTreeMap<char, u8>,
    vocabulary: BTreeMap<String, u32>,
    tokenizer: BpeTokenizer,
    pretokenizer: Regex,
}

pub struct Encoding {
    pub pieces: Vec<String>,
    pub token_ids: Vec<u32>,
    pub token_bytes: Vec<Vec<u8>>,
    pub decoded: String,
}

impl Gpt2PolicyExample {
    pub fn tiny_a1() -> Result<Self, String> {
        // region:gpt2-byte-mapping
        let mut byte_order = (b'!'..=b'~')
            .chain(0xa1..=0xac)
            .chain(0xae..=0xff)
            .collect::<Vec<_>>();
        let mut symbols = byte_order
            .iter()
            .map(|&byte| char::from(byte))
            .collect::<Vec<_>>();
        let mut next_codepoint = 256u32;
        for byte in 0..=255u8 {
            if !byte_order.contains(&byte) {
                let symbol = char::from_u32(next_codepoint).ok_or("invalid byte-map symbol")?;
                byte_order.push(byte);
                symbols.push(symbol);
                next_codepoint += 1;
            }
        }
        let mut bytes = ['\0'; 256];
        let mut reverse_bytes = BTreeMap::new();
        let mut vocabulary = BTreeMap::new();
        for (id, (&byte, &symbol)) in byte_order.iter().zip(&symbols).enumerate() {
            bytes[byte as usize] = symbol;
            reverse_bytes.insert(symbol, byte);
            vocabulary.insert(symbol.to_string(), id as u32);
        }
        // endregion:gpt2-byte-mapping
        let merged_symbol = format!("{}{}", bytes[b'a' as usize], bytes[b'1' as usize]);
        vocabulary.insert(merged_symbol, 256);
        // A single hypothetical rank is enough to expose the a/1 boundary.
        // Reuse the existing builder and rank engine instead of a second BPE.
        let tokenizer =
            BpeTokenizer::from_merge_pairs(&[TokenPair::new(u32::from(b'a'), u32::from(b'1'))])
                .map_err(|error| error.to_string())?;
        Ok(Self {
            bytes,
            reverse_bytes,
            vocabulary,
            tokenizer,
            pretokenizer: Regex::new(PATTERN).map_err(|error| error.to_string())?,
        })
    }

    pub fn encode(&self, text: &str) -> Result<Encoding, String> {
        if text.len() > 4096 {
            return Err("chapter contrast exceeds its document byte limit".into());
        }
        let mut pieces = Vec::new();
        let mut token_ids = Vec::new();
        let mut token_bytes = Vec::new();
        // region:gpt2-pretoken-boundaries
        for matched in self.pretokenizer.find_iter(text) {
            let piece = matched.map_err(|error| error.to_string())?.as_str();
            pieces.push(piece.to_owned());
            for content_id in self.tokenizer.encode_content(piece.as_bytes()) {
                let expansion = self
                    .tokenizer
                    .token_bytes(content_id)
                    .ok_or("unknown rank-engine token")?;
                let symbols = expansion
                    .iter()
                    .map(|&byte| self.bytes[byte as usize])
                    .collect::<String>();
                token_ids.push(
                    *self
                        .vocabulary
                        .get(&symbols)
                        .ok_or("missing vocabulary symbol")?,
                );
                // The published policy reverses the byte map before decoding UTF-8.
                token_bytes.push(
                    symbols
                        .chars()
                        .map(|symbol| {
                            self.reverse_bytes
                                .get(&symbol)
                                .copied()
                                .ok_or("unknown byte-map symbol")
                        })
                        .collect::<Result<Vec<_>, _>>()?,
                );
            }
        }
        // endregion:gpt2-pretoken-boundaries
        let decoded = String::from_utf8(token_bytes.concat()).map_err(|error| error.to_string())?;
        Ok(Encoding {
            pieces,
            token_ids,
            token_bytes,
            decoded,
        })
    }
}
