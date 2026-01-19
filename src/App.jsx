import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MostActiveEquity from './mostActiveEquity/component/MostActiveEquity'

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<MostActiveEquity />} />
          <Route path="/stock-details" element={<NseStockDetails />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
