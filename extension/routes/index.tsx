import { Route, Routes } from "react-router-dom"

import LoginForm from "./pages/LoginForm"
import RegisterForm from "./pages/RegisterForm"
import HomePage from "./pages/HomePage"
import '../tailwind.css'


export const Routing = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginForm />} />
    <Route path="/register" element={<RegisterForm />} />
  </Routes>
)