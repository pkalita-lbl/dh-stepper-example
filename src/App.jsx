import React from 'react'
import DataHarmonizer from './components/DataHarmonizer'

import schema from './schema.json'

function App() {
  return (
    <>
      <DataHarmonizer schema={schema} template='ViewA' />
    </>
  )
}

export default App
