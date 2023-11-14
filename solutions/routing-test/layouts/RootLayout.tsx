import { Outlet, NavLink } from "react-router-dom"

export default function RootLayout() {
  return (
    <div className="root-layout">
      <header>
        <h1>Routing Test</h1>
        <nav>
          <ul>
            <li>
              <NavLink to="/">Home</NavLink>
            </li>
            <li>
              <NavLink to="about">About</NavLink>
            </li>
            <li>
              <NavLink to="help">Help</NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
