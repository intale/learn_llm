// A withdrawal plan over an explicitly supplied known graph, not erasure.

use super::stream::DataError;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const MAX_NODE_ID_BYTES: usize = 256;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NodeKind {
    RawSource,
    Artifact,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LineageNode {
    pub id: String,
    pub kind: NodeKind,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LineageEdge {
    pub child: String,
    pub parent: String,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct KnownLineage {
    pub edges: Vec<LineageEdge>,
    pub nodes: Vec<LineageNode>,
}
#[derive(Clone, Copy)]
pub struct GraphLimits {
    pub max_edges: usize,
    pub max_nodes: usize,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct WithdrawalPlan {
    pub artifacts: Vec<String>,
    pub sources: Vec<String>,
}

impl KnownLineage {
    fn validate(&self, limits: GraphLimits) -> Result<BTreeMap<&str, NodeKind>, DataError> {
        if self.nodes.len() > limits.max_nodes || self.edges.len() > limits.max_edges {
            return Err(DataError::InvalidGraph("graph budget"));
        }
        let mut kinds = BTreeMap::new();
        for node in &self.nodes {
            if node.id.is_empty()
                || node.id.len() > MAX_NODE_ID_BYTES
                || kinds.insert(node.id.as_str(), node.kind).is_some()
            {
                return Err(DataError::InvalidGraph("empty or duplicate node"));
            }
        }
        let mut edges = BTreeSet::new();
        let mut indegrees: BTreeMap<_, usize> = kinds.keys().map(|&id| (id, 0)).collect();
        for edge in &self.edges {
            if !kinds.contains_key(edge.parent.as_str())
                || !kinds.contains_key(edge.child.as_str())
                || !edges.insert((edge.parent.as_str(), edge.child.as_str()))
            {
                return Err(DataError::InvalidGraph("dangling or duplicate edge"));
            }
            let count = indegrees
                .get_mut(edge.child.as_str())
                .ok_or(DataError::InvalidGraph("edge"))?;
            *count = count.checked_add(1).ok_or(DataError::Overflow)?;
        }
        let mut ready: BTreeSet<&str> = indegrees
            .iter()
            .filter_map(|(&id, &n)| (n == 0).then_some(id))
            .collect();
        let mut visited = 0;
        while let Some(id) = ready.pop_first() {
            visited += 1;
            for &(parent, child) in &edges {
                if parent == id {
                    let degree = indegrees
                        .get_mut(child)
                        .ok_or(DataError::InvalidGraph("edge"))?;
                    *degree -= 1;
                    if *degree == 0 {
                        ready.insert(child);
                    }
                }
            }
        }
        if visited != kinds.len() {
            return Err(DataError::InvalidGraph("cycle"));
        }
        Ok(kinds)
    }

    // region:known-descendant-withdrawal
    pub fn withdrawal(
        &self,
        raw_roots: &[String],
        limits: GraphLimits,
    ) -> Result<WithdrawalPlan, DataError> {
        let kinds = self.validate(limits)?;
        let mut reached = BTreeSet::new();
        let mut pending = BTreeSet::new();
        for root in raw_roots {
            if kinds.get(root.as_str()) != Some(&NodeKind::RawSource) {
                return Err(DataError::InvalidGraph("unknown or non-source root"));
            }
            pending.insert(root.as_str());
        }
        while let Some(id) = pending.pop_first() {
            if !reached.insert(id) {
                continue;
            }
            for edge in &self.edges {
                if edge.parent == id && !reached.contains(edge.child.as_str()) {
                    pending.insert(edge.child.as_str());
                }
            }
        }
        let mut artifacts = Vec::new();
        let mut sources = Vec::new();
        for id in reached {
            match kinds.get(id) {
                Some(NodeKind::RawSource) => sources.push(id.into()),
                Some(NodeKind::Artifact) => artifacts.push(id.into()),
                None => return Err(DataError::InvalidGraph("unknown reached node")),
            }
        }
        Ok(WithdrawalPlan { artifacts, sources })
    }
    // endregion:known-descendant-withdrawal
}

#[cfg(test)]
mod tests {
    use super::*;
    fn graph() -> KnownLineage {
        KnownLineage {
            nodes: [
                ("r0", NodeKind::RawSource),
                ("f0", NodeKind::Artifact),
                ("s0", NodeKind::Artifact),
                ("w0", NodeKind::Artifact),
                ("r9", NodeKind::RawSource),
            ]
            .map(|(id, kind)| LineageNode {
                id: id.into(),
                kind,
            })
            .to_vec(),
            edges: [("r0", "f0"), ("f0", "s0"), ("s0", "w0"), ("f0", "w0")]
                .map(|(parent, child)| LineageEdge {
                    parent: parent.into(),
                    child: child.into(),
                })
                .to_vec(),
        }
    }
    fn limits() -> GraphLimits {
        GraphLimits {
            max_edges: 16,
            max_nodes: 16,
        }
    }
    #[test]
    fn shared_descendant_is_sorted_and_withdrawn_once() {
        assert_eq!(
            graph().withdrawal(&["r0".into()], limits()).unwrap(),
            WithdrawalPlan {
                artifacts: vec!["f0".into(), "s0".into(), "w0".into()],
                sources: vec!["r0".into()]
            }
        );
    }
    #[test]
    fn unconnected_source_and_empty_selection_are_preserved() {
        assert!(
            graph()
                .withdrawal(&[], limits())
                .unwrap()
                .artifacts
                .is_empty()
        );
        assert_eq!(
            graph()
                .withdrawal(&["r9".into()], limits())
                .unwrap()
                .sources,
            ["r9"]
        );
    }
    #[test]
    fn unknown_root_dangling_edge_and_cycle_refuse() {
        assert!(graph().withdrawal(&["missing".into()], limits()).is_err());
        let mut g = graph();
        g.edges[0].child = "unknown".into();
        assert!(g.withdrawal(&["r0".into()], limits()).is_err());
        let mut g = graph();
        g.edges.push(LineageEdge {
            parent: "w0".into(),
            child: "f0".into(),
        });
        assert!(g.withdrawal(&["r0".into()], limits()).is_err());
    }
    #[test]
    fn duplicate_nodes_edges_non_source_roots_and_budget_refuse() {
        let mut g = graph();
        g.nodes.push(g.nodes[0].clone());
        assert!(g.withdrawal(&[], limits()).is_err());
        let mut g = graph();
        g.edges.push(g.edges[0].clone());
        assert!(g.withdrawal(&[], limits()).is_err());
        assert!(graph().withdrawal(&["f0".into()], limits()).is_err());
        assert!(
            graph()
                .withdrawal(
                    &[],
                    GraphLimits {
                        max_edges: 1,
                        max_nodes: 1
                    }
                )
                .is_err()
        );
    }
}
