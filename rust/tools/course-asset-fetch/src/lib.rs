//! Incidental HTTPS transport. Reqwest owns response parsing, resolving/following
//! redirects, status errors and network I/O. Content algorithms remain elsewhere.
use std::time::Duration;

use reqwest::{
    Url,
    blocking::{Client, Response},
    redirect::Policy,
};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TransportSource {
    pub source_id: String,
    pub requested_url: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TransportConfig {
    pub allowed_hosts: Vec<String>,
    pub expected_payload_ceiling_bytes: u64,
    pub sources: Vec<TransportSource>,
    pub wall_seconds: u64,
}

#[derive(Debug)]
pub enum FetchError {
    Configuration,
    Endpoint,
    Transport,
    Metadata,
    Content,
    Storage,
    Deadline,
}

// URL syntax belongs to reqwest's mature URL parser. The selected policy owns
// only permission: HTTPS, no credentials/fragment/nondefault port, exact host.
pub fn admitted_url(value: &str, hosts: &[String]) -> Result<Url, FetchError> {
    if value
        .bytes()
        .any(|b| b.is_ascii_control() || b == b' ' || b == b'\\')
    {
        return Err(FetchError::Endpoint);
    }
    let url = Url::parse(value).map_err(|_| FetchError::Endpoint)?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || url.port().is_some_and(|p| p != 443)
        || !hosts
            .iter()
            .any(|host| Some(host.as_str()) == url.host_str())
    {
        return Err(FetchError::Endpoint);
    }
    Ok(url)
}

pub fn client(hosts: Vec<String>, timeout: Duration) -> Result<Client, FetchError> {
    if hosts.is_empty() || timeout.is_zero() {
        return Err(FetchError::Configuration);
    }
    let redirect_hosts = hosts.clone();
    let redirects = Policy::custom(move |attempt| {
        if admitted_url(attempt.url().as_str(), &redirect_hosts).is_err() {
            attempt.error("destination refused")
        } else {
            // The client, not a hand-written loop, resolves/follows redirects
            // and enforces its established five-hop limit.
            Policy::limited(5).redirect(attempt)
        }
    });
    Client::builder()
        .https_only(true)
        .no_proxy()
        .retry(reqwest::retry::never())
        .referer(false)
        .min_tls_version(reqwest::tls::Version::TLS_1_2)
        .timeout(timeout)
        .redirect(redirects)
        .build()
        .map_err(|_| FetchError::Transport)
}

pub fn response(
    client: &Client,
    requested: &str,
    hosts: &[String],
    media_type: &str,
) -> Result<Response, FetchError> {
    let url = admitted_url(requested, hosts)?;
    let response = client
        .get(url)
        .header(reqwest::header::ACCEPT_ENCODING, "identity")
        .send()
        .and_then(Response::error_for_status)
        .map_err(|_| FetchError::Transport)?;
    let actual = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .ok_or(FetchError::Metadata)?
        .parse::<mime::Mime>()
        .map_err(|_| FetchError::Metadata)?;
    let expected = media_type
        .parse::<mime::Mime>()
        .map_err(|_| FetchError::Configuration)?;
    if actual.essence_str() != expected.essence_str()
        || response
            .headers()
            .get(reqwest::header::CONTENT_ENCODING)
            .is_some_and(|v| v != "identity")
    {
        return Err(FetchError::Metadata);
    }
    Ok(response)
}

pub fn build_flag(value: &str) -> Result<bool, FetchError> {
    match value {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(FetchError::Configuration),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn closed_flags_and_exact_destination_authority() {
        assert!(build_flag("true").unwrap());
        assert!(!build_flag("false").unwrap());
        for flag in ["TRUE", "0", "", " false"] {
            assert!(build_flag(flag).is_err());
        }
        let hosts = vec!["example.invalid".into()];
        assert!(admitted_url("https://example.invalid/a?secret=private", &hosts).is_ok());
        for value in [
            "http://example.invalid/a",
            "https://example.invalid.evil/a",
            "https://user@example.invalid/a",
            "https://example.invalid:444/a",
            "https://example.invalid/a#fragment",
            "https://example.invalid/a\\b",
            "https://example.invalid/a\nb",
        ] {
            assert!(admitted_url(value, &hosts).is_err());
        }
    }
    #[test]
    fn zero_deadline_and_missing_authority_refuse_without_request() {
        assert!(client(vec!["example.invalid".into()], Duration::ZERO).is_err());
        assert!(client(vec![], Duration::from_secs(1)).is_err());
    }
}
