import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeWeb from './views/web/HomeWeb'
import HomeMobile from './views/mobile/HomeMobile'
import Example from './views/Example'
import Layout from './components/Layout'
import Login from './views/web/Login'
import SignUp from './views/web/SignUp'

export default function App(){
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomeWeb />} />
          <Route path="/mobile" element={<HomeMobile />} />
          <Route path="/examples" element={<Example />} />
          <Route path="/login" element={<Login />} /> 
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
