export default defineEventHandler(() => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Nitro GraphQL Yoga Playground</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .link {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
          }
          .link:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Nitro GraphQL Yoga Playground</h1>
          <p>Welcome to the Nitro GraphQL Yoga example application!</p>
          <p>The GraphQL endpoint is available at:</p>
          <a href="/api/graphql" class="link">Open GraphQL Playground →</a>
        </div>
      </body>
    </html>
  `
})