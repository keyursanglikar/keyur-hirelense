import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Module1Dashboard from './Dashboard'

const Module1Routes = () => {
  return (
    <Routes>
      <Route path="/" element={<Module1Dashboard />} />
    </Routes>
  )
}

export default Module1Routes
