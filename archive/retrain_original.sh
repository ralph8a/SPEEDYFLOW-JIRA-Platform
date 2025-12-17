#!/usr/bin/env bash
# Retrain model using only the original ticket-labeled dataset
python /train_comment_model.py --dataset data/comments_dataset.csv --models-dir /models
