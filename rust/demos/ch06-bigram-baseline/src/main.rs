use llm_from_scratch::bigram::BigramModel;

fn main() {
    let documents: [&[u32]; 2] = [&[0, 1, 1, 2], &[0, 1, 2]];
    let model = BigramModel::fit(3, 1.0, documents).expect("fixture is valid");
    println!("vocabulary: {}", model.vocabulary_size());
    println!("alpha: {:.1}", model.alpha());
    println!(
        "counts row 0: [0, {}, {}]",
        model.count(0, 1).unwrap(),
        model.count(0, 2).unwrap()
    );
    println!(
        "counts row 1: [0, {}, {}]",
        model.count(1, 1).unwrap(),
        model.count(1, 2).unwrap()
    );
    println!(
        "probabilities row 0: [{:.3}, {:.3}, {:.3}]",
        model.probability(0, 0).unwrap(),
        model.probability(0, 1).unwrap(),
        model.probability(0, 2).unwrap()
    );
    println!(
        "probabilities unseen row 2: [{:.3}, {:.3}, {:.3}]",
        model.probability(2, 0).unwrap(),
        model.probability(2, 1).unwrap(),
        model.probability(2, 2).unwrap()
    );
    println!("prediction row 0: {:?}", model.predict(0).unwrap());
}
