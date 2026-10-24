CREATE TABLE item_verification_question (
    question_id INT NOT NULL AUTO_INCREMENT,
    item_id INT NOT NULL,
    question_order TINYINT UNSIGNED NOT NULL,
    question_text VARCHAR(500) NOT NULL,
    PRIMARY KEY (question_id),
    UNIQUE KEY uq_item_verification_question_order (item_id, question_order),
    CONSTRAINT item_verification_question_fk_item
        FOREIGN KEY (item_id) REFERENCES item (item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE claim_verification_answer (
    answer_id INT NOT NULL AUTO_INCREMENT,
    claim_id INT NOT NULL,
    question_order TINYINT UNSIGNED NOT NULL,
    question_text VARCHAR(500) NOT NULL,
    answer_text TEXT NOT NULL,
    PRIMARY KEY (answer_id),
    UNIQUE KEY uq_claim_verification_answer_order (claim_id, question_order),
    CONSTRAINT claim_verification_answer_fk_claim
        FOREIGN KEY (claim_id) REFERENCES claim (claim_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
