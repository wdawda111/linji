module.exports = {
  apps: [
    {
      name: 'linji',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      // 内存不足自动重启兜底
      max_memory_restart: '512M',
    },
  ],
}
