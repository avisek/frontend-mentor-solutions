import {
  createBrowserRouter, 
  createRoutesFromElements,
  Route, 
  RouterProvider
} from 'react-router-dom'

// layouts
import RootLayout from './layouts/RootLayout'

// pages
import Home from './pages/Home'
import About from './pages/About'
import NotFound from './pages/NotFound'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<RootLayout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    basename: '/frontend-mentor-solutions/routing-test/'
  },
)

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App
