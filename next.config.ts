import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL はローカルファイル接続でネイティブバインディングを使うので、バンドルさせない
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
