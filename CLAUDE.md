# 作業ルール

リポジトリのファイルを追加、変更、削除するときは、次の順を飛ばさない。質問への回答だけ、調査だけの説明、ユーザーが「この作業は Issue 不要」と明示したときは、Issue もブランチも作らない。

## 1. Issue を作る

実装、修正、ドキュメント変更の前に、GitHub Issue を1件作る。

- タイトルは、何をするかが一読で分かる日本語にする
- 本文に目的と完了条件を書く
- 無関係な作業を1つの Issue にまとめない

## 2. Issue からブランチを作る

`main` の最新から切る。ブランチ名は `{Issue番号}-{短い英語}` とする。

```text
1-issue-branch-rules
12-add-due-date
```

1つの Issue につきブランチは1本にする。別の Issue の変更を同じブランチへ混ぜない。

## 3. ブランチでコミットし、Pull Request で戻す

- コミット先は作業ブランチだけにする
- `main` へ commit しない。`main` へ push しない。`main` へ force push しない
- Pull Request のタイトルか本文に、その Issue 番号を `#12` の形で書く
- その Issue を終える変更なら、本文に `Fixes #12` と書く
- マージは GitHub の Pull Request だけから行う

## 禁止

- Issue を作る前にブランチを切る
- Issue 番号で始まらないブランチ名
- `main` への直接の commit、push、force push
- `main` の削除
