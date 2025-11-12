{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@rpringle-6e6b2f6d-94a1-4f64-9b2d-6f5a9f1c7e2a/data": [
        "data/src/index.ts"
      ],
      "@rpringle-6e6b2f6d-94a1-4f64-9b2d-6f5a9f1c7e2a/auth": [
        "auth/src/index.ts"
      ]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
