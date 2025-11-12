{
  "name": "api",
  "projectType": "application",
  "sourceRoot": "apps/api/src",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{workspaceRoot}/dist/apps/api"],
      "options": {
        "command": "tsc -p apps/api/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "parallel": true,
        "commands": [
          "tsc -w -p apps/api/tsconfig.app.json",
          "node --watch dist/apps/api/main.js"
        ]
      }
    },
    "serve:once": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "tsc -p apps/api/tsconfig.app.json",
          "node dist/apps/api/main.js"
        ]
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/api/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/api/jest.config.ts",
        "passWithNoTests": true
      }
    }
  }
}
