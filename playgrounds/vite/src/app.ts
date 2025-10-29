// GraphQL Query Helper
async function graphqlQuery(query: string, variables?: any) {
  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Styles
const styles = {
  container: "display: flex; gap: 60px; padding: 40px; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; align-items: center;",
  leftPanel: "flex: 0 0 200px;",
  rightPanel: "flex: 1; max-width: 900px;",

  mainTitle: "font-size: 36px; font-weight: 700; color: #222; margin: 0 0 8px 0; line-height: 1.2;",
  subTitle: "font-size: 14px; color: #999; margin: 0; font-weight: 400;",

  examples: "margin-bottom: 20px;",
  exampleTitle: "font-size: 16px; color: #666; margin: 0 0 15px 0; font-weight: 500;",

  results: "padding: 24px; background: #1e1e1e; border-radius: 10px; min-height: 200px; color: #e0e0e0; font-size: 14px; overflow-x: auto; line-height: 1.6;",

  buttons: "display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;",
  button: "padding: 14px 28px; cursor: pointer; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
};

export function setupApp(element: HTMLButtonElement) {
  const container = document.createElement("div");
  container.style.cssText = styles.container;

  // Left Panel
  const leftPanel = document.createElement("div");
  leftPanel.style.cssText = styles.leftPanel;

  // Logos Container
  const logosContainer = document.createElement("div");
  logosContainer.style.cssText = "display: flex; gap: 16px; margin-bottom: 16px; align-items: center;";

  // Nitro Logo Link
  const nitroLink = document.createElement("a");
  nitroLink.href = "https://v3.nitro.build";
  nitroLink.target = "_blank";
  nitroLink.style.cssText = "transition: transform 0.2s;";
  nitroLink.onmouseenter = () => nitroLink.style.transform = "scale(1.1)";
  nitroLink.onmouseleave = () => nitroLink.style.transform = "scale(1)";

  const nitroLogo = document.createElement("img");
  nitroLogo.src = "/nitro.svg";
  nitroLogo.alt = "Nitro";
  nitroLogo.style.cssText = "width: 48px; height: 48px; display: block;";
  nitroLink.appendChild(nitroLogo);

  // Vite Logo Link
  const viteLink = document.createElement("a");
  viteLink.href = "https://vitejs.dev";
  viteLink.target = "_blank";
  viteLink.style.cssText = "transition: transform 0.2s;";
  viteLink.onmouseenter = () => viteLink.style.transform = "scale(1.1)";
  viteLink.onmouseleave = () => viteLink.style.transform = "scale(1)";

  const viteLogo = document.createElement("img");
  viteLogo.src = "/vite.svg";
  viteLogo.alt = "Vite";
  viteLogo.style.cssText = "width: 48px; height: 48px; display: block;";
  viteLink.appendChild(viteLogo);

  // GraphQL Logo Link
  const graphqlLink = document.createElement("a");
  graphqlLink.href = "https://github.com/productdevbook/nitro-graphql";
  graphqlLink.target = "_blank";
  graphqlLink.style.cssText = "transition: transform 0.2s;";
  graphqlLink.onmouseenter = () => graphqlLink.style.transform = "scale(1.1)";
  graphqlLink.onmouseleave = () => graphqlLink.style.transform = "scale(1)";

  const graphqlLogo = document.createElement("img");
  graphqlLogo.src = "https://graphql.org/img/logo.svg";
  graphqlLogo.alt = "GraphQL";
  graphqlLogo.style.cssText = "width: 48px; height: 48px; display: block;";
  graphqlLink.appendChild(graphqlLogo);

  logosContainer.append(nitroLink, viteLink, graphqlLink);

  const mainTitle = document.createElement("h1");
  mainTitle.textContent = "GraphQL Demo";
  mainTitle.style.cssText = styles.mainTitle;

  leftPanel.append(logosContainer, mainTitle);

  // Right Panel
  const rightPanel = document.createElement("div");
  rightPanel.style.cssText = styles.rightPanel;

  // Examples Section
  const examples = document.createElement("div");
  examples.style.cssText = styles.examples;

  const exampleTitle = document.createElement("h3");
  exampleTitle.textContent = "Examples";
  exampleTitle.style.cssText = styles.exampleTitle;
  examples.appendChild(exampleTitle);

  // Buttons
  const buttonsDiv = document.createElement("div");
  buttonsDiv.style.cssText = styles.buttons;

  // Results Display
  const results = document.createElement("div");
  results.style.cssText = styles.results;
  results.innerHTML = "<em style='color: #888;'>Click a button to see results...</em>";

  // Helper Functions
  const showResult = (data: any, label: string, color: string) => {
    results.innerHTML = `
      <div style="color: ${color}; font-weight: 600; margin-bottom: 12px; font-size: 15px;">✓ ${label}</div>
      <pre style="background: #2d2d2d; color: #e0e0e0; padding: 16px; border-radius: 6px; font-size: 13px; border: 1px solid #3d3d3d; overflow-x: auto; margin: 0;">${JSON.stringify(data, null, 2)}</pre>
    `;
  };

  const showError = (error: any) => {
    results.innerHTML = `
      <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">✗ Error</div>
      <pre style="color: #ff6b6b; margin: 0;">${error}</pre>
    `;
  };

  const createButton = (text: string, color: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `${styles.button}; background: ${color};`;
    btn.onmouseenter = () => btn.style.transform = "translateY(-2px)";
    btn.onmouseleave = () => btn.style.transform = "translateY(0)";
    btn.onclick = onClick;
    buttonsDiv.appendChild(btn);
  };

  // Buttons
  createButton("Get User", "#10b981", async () => {
    try {
      results.innerHTML = "<em style='color: #888;'>Loading...</em>";
      const data = await graphqlQuery(`
        query GetUser($id: ID!) {
          getUser(id: $id) { id email name createdAt }
        }
      `, { id: "1" });
      showResult(data, "Query Result", "#10b981");
    } catch (error) {
      showError(error);
    }
  });

  createButton("Create User", "#3b82f6", async () => {
    try {
      results.innerHTML = "<em style='color: #888;'>Creating...</em>";
      const randomId = Math.floor(Math.random() * 10000);
      const data = await graphqlQuery(`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { id email name createdAt }
        }
      `, {
        input: {
          email: `user${randomId}@example.com`,
          name: `Demo User ${randomId}`,
        },
      });
      showResult(data, "Mutation Result", "#3b82f6");
    } catch (error) {
      showError(error);
    }
  });

  createButton("Get All Users", "#f59e0b", async () => {
    try {
      results.innerHTML = "<em style='color: #888;'>Loading...</em>";
      const users = await Promise.all([
        graphqlQuery(`query { getUser(id: "1") { id email name createdAt } }`),
        graphqlQuery(`query { getUser(id: "2") { id email name createdAt } }`),
      ]);
      showResult(users, "All Users", "#f59e0b");
    } catch (error) {
      showError(error);
    }
  });

  // Assemble
  examples.appendChild(buttonsDiv);
  rightPanel.append(examples, results);
  container.append(leftPanel, rightPanel);
  element.appendChild(container);
}
