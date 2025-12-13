"""Train comment patterns model

Expected input CSV: data/comments_dataset.csv with columns:
 - summary (text)
 - comments (text)
 - labels (comma-separated tags)

Outputs:
 - ml_service/models/comment_suggester.keras
 - ml_service/models/comment_labels_binarizer.pkl
"""
import os
import argparse
import pandas as pd
import numpy as np
from pathlib import Path
import pickle

def ensure_spacy_model():
    try:
        import spacy
        spacy.load('es_core_news_md')
    except Exception:
        raise RuntimeError('Please install spaCy Spanish model: python -m spacy download es_core_news_md')

def build_model(input_dim, output_dim):
    from tensorflow.keras import layers, models, optimizers
    inp = layers.Input(shape=(input_dim,))
    x = layers.Dense(256, activation='relu')(inp)
    x = layers.Dropout(0.25)(x)
    x = layers.Dense(128, activation='relu')(x)
    out = layers.Dense(output_dim, activation='sigmoid')(x)
    model = models.Model(inputs=inp, outputs=out)
    return model

def main(dataset_path, models_dir, epochs_phase1=5, epochs_phase2=3, batch_size=32):
    ensure_spacy_model()
    import spacy
    nlp = spacy.load('es_core_news_md', disable=['ner'])

    ds = pd.read_csv(dataset_path)
    if ds.empty:
        raise RuntimeError('Dataset empty')

    texts = (ds.get('summary','').fillna('') + '. ' + ds.get('comments','').fillna('')).tolist()

    print('Computing embeddings...')
    embeddings = np.vstack([nlp(str(t)) .vector for t in texts])

    # labels
    raw_labels = ds.get('labels', '').fillna('').astype(str).apply(lambda s: [x.strip() for x in s.split(',') if x.strip()])
    from sklearn.preprocessing import MultiLabelBinarizer
    mlb = MultiLabelBinarizer()
    Y = mlb.fit_transform(raw_labels)

    # save binarizer
    models_dir = Path(models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)
    with open(models_dir / 'comment_labels_binarizer.pkl', 'wb') as f:
        pickle.dump(mlb, f)

    input_dim = embeddings.shape[1]
    output_dim = Y.shape[1]

    model = build_model(input_dim, output_dim)
    import tensorflow as tf
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss='binary_crossentropy', metrics=['accuracy'])

    # Phase 1: initial training
    print('Phase 1 training...')
    model.fit(embeddings, Y, epochs=epochs_phase1, batch_size=batch_size, validation_split=0.1)

    # Phase 2: fine-tune with lower LR
    print('Phase 2 fine-tuning...')
    tf.keras.backend.set_value(model.optimizer.learning_rate, 1e-4)
    model.fit(embeddings, Y, epochs=epochs_phase2, batch_size=batch_size, validation_split=0.1)

    # Save model
    model.save(models_dir / 'comment_suggester.keras')
    print('Model and binarizer saved to', models_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', default='../data/comments_dataset.csv')
    parser.add_argument('--models-dir', default='./models')
    args = parser.parse_args()
    main(args.dataset, args.models_dir)
