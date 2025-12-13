#!/usr/bin/env bash
# Retrain model using only the original ticket-labeled dataset
python ml_service/train_comment_model.py --dataset data/comments_dataset.csv --models-dir ml_service/models
