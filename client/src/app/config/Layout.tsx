import { Outlet } from "react-router";

export function Layout() {
  return (
    <div className="app">
      <main className="name">
        <Outlet />
      </main>
    </div>
  );
}