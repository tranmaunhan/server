import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [healthResponse, todoResponse] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/todos"),
        ]);

        if (!healthResponse.ok || !todoResponse.ok) {
          throw new Error("Khong tai duoc du lieu tu backend.");
        }

        setHealth(await healthResponse.json());
        setTodos(await todoResponse.json());
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">React + Spring Boot + PostgreSQL</p>
        <h1>Stack mau da noi container vao cung mot mang noi bo</h1>
        <p className="lead">
          Frontend goi backend qua <code>/api</code>, backend ket noi PostgreSQL bang service name <code>postgres</code>.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Trang thai backend</h2>
          {loading && <p>Dang tai...</p>}
          {error && <p className="error">{error}</p>}
          {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
        </article>

        <article className="card">
          <h2>Du lieu tu PostgreSQL</h2>
          {loading && <p>Dang tai...</p>}
          {!loading && !error && (
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.id}>
                  <span>{todo.title}</span>
                  <strong>{todo.completed ? "Done" : "Pending"}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
