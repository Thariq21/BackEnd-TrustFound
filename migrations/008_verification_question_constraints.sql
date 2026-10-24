ALTER TABLE item_verification_question
    ADD CONSTRAINT chk_item_verification_question_order
        CHECK (question_order BETWEEN 1 AND 10),
    ADD CONSTRAINT chk_item_verification_question_text
        CHECK (CHAR_LENGTH(TRIM(question_text)) BETWEEN 1 AND 500);

ALTER TABLE claim_verification_answer
    ADD CONSTRAINT chk_claim_verification_answer_order
        CHECK (question_order BETWEEN 1 AND 10),
    ADD CONSTRAINT chk_claim_verification_question_text
        CHECK (CHAR_LENGTH(TRIM(question_text)) BETWEEN 1 AND 500),
    ADD CONSTRAINT chk_claim_verification_answer_text
        CHECK (CHAR_LENGTH(TRIM(answer_text)) > 0);
