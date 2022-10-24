import React, { useState, useRef } from 'react'
import DataHarmonizer from './components/DataHarmonizer'
import Stepper from './components/Stepper'

import schema from './schema.json'

// controls which field is used to merge data from different DH views
const ID_FIELD = 'id'
// controls which rows are shown in each view
const TYPE_FIELD = 'type'

function App() {
  const dhRef = useRef(null)
  const templates = ['Common', 'A', 'B', 'C']
  const [active, setActive] = useState(0)
  const [data, setData] = useState([])

  const activeTemplate = templates[active]

  function handleStepChange(nextStep) {
    const current = dhRef.current.getDataObjects(false)
    setActive(nextStep)
    setData(data => {
      if (data.length === 0) {
        return current
      } else {
        const merged = []
        for (const row of data) {
          const rowId = row[ID_FIELD]
          const update = current.find(r => r[ID_FIELD] === rowId)
          merged.push({
            ...row,
            ...update
          })
        }
        return merged
      }
    })
  }

  function handleAddTestData() {
    dhRef.current.loadDataObjects([
      {
        id: 1,
        name: 'x',
        type: 'A',
        common_field: 'asdf'
      },
      {
        id: 2,
        name: 'y',
        type: 'B',
        common_field: 'qwert'
      },
      {
        id: 3,
        name: 'z',
        type: 'A; C',
        common_field: 'xcvbn'
      },
    ])
  }

  let filteredData;
  if (activeTemplate === 'Common') {
    filteredData = data;
  } else {
    filteredData = data.filter(row => row[TYPE_FIELD].includes(activeTemplate))
  }
  
  return (
    <div className='p-4'>
      <div className="row">
        <div className="col-6">
          <Stepper steps={templates} active={active} onChange={handleStepChange} />
          <DataHarmonizer schema={schema} template={activeTemplate} data={filteredData} dhRef={dhRef} />
          <button className="btn btn-outline-secondary mt-2" onClick={handleAddTestData}>Test Data</button>
        </div>
        <div className="col-6">
          <pre className='alert alert-secondary mt-2'>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  )
}

export default App
