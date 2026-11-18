// npm test から動く。Vitest を動かす前に、今のフォルダのドライブ名を大文字にそろえる。
//
// Windows では、ターミナルの今のフォルダが小文字のドライブ名（c:\...、VS Code のターミナルで起きやすい）のことがある。
// そのまま Vitest を動かすと、Vitest の本体は c:\... から、テストのファイルは C:\... から読み込まれて書き方がずれ、
// 「Vitest failed to find the current suite」のエラーでテストが1件も動かない。
// 今のフォルダを C:\... にしてから、C:\... の場所にある Vitest を読み込んで、書き方をそろえる。
import { pathToFileURL } from "node:url";
import path from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase());
process.chdir(cwd);
await import(pathToFileURL(path.join(cwd, "node_modules", "vitest", "vitest.mjs")).href);
