import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomeMobile from './views/mobile/HomeMobile'
import HomeWeb from './views/web/HomeWeb'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<HomeWeb/>} />
      <Route path="/mobile" element={<HomeMobile/>} />
    </Routes>
  )
}
