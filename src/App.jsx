import React, { useState, useRef, useMemo } from 'react'
import DataHarmonizer from './components/DataHarmonizer'
import Stepper from './components/Stepper'

import schema from './schema.json'

// controls which field is used to merge data from different DH views
const ID_FIELD = 'id'
// controls which rows are shown in each view
const TYPE_FIELD = 'type'

const TEMPLATES = ['Common', 'A', 'B', 'C']

function App() {
  const dhRef = useRef(null)
  const [active, setActive] = useState(0)
  const [data, setData] = useState([])
  const [invalidCells, setInvalidCells] = useState({})

  function handleStepChange(nextStep) {
    const current = dhRef.current.getDataObjects(false)
    // TODO: open bug in DH re: delimiter mismatch
    for (const row of current) {
      for (const [key, value] of Object.entries(row)) {
        if (Array.isArray(value) && value[0].includes(';')) {
          row[key] = value[0].split(';')
        }
      }
    }
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
        type: ['A'],
        common_field: 'asdf'
      },
      {
        id: 2,
        name: 'y',
        type: ['B'],
        common_field: 'qwert'
      },
      {
        id: 3,
        name: 'z',
        type: ['A', 'C'],
        common_field: 'xcvbn'
      },
    ])
  }

  const activeTemplate = TEMPLATES[active]

  function handleValidate() {
    dhRef.current.validate()
    setInvalidCells(prev => {
      return {
        ...prev,
        [activeTemplate]: dhRef.current.invalid_cells
      }
    })
  }


  const filteredData = useMemo(() => {
    if (activeTemplate === 'Common') {
      return data
    } else {
      return data.filter(row => row[TYPE_FIELD] && row[TYPE_FIELD].includes(activeTemplate))
    }
  }, [data, activeTemplate])
  
  return (
    <div className='p-4'>
      <div className="row">
        <div className="col-6">
          <Stepper steps={TEMPLATES} active={active} onChange={handleStepChange} />
          <button className='btn btn-warning mb-2' onClick={handleValidate}>Validate</button>
          <DataHarmonizer 
            schema={schema} 
            template={activeTemplate} 
            data={filteredData} 
            invalidCells={invalidCells[activeTemplate]}
            dhRef={dhRef} 
          />
          <button className="btn btn-outline-secondary mt-2" onClick={handleAddTestData}>Test Data</button>
        </div>
        <div className="col-6">
          <div className='alert alert-warning small'>
            <h5 className='alert-heading'>Validation</h5>
            <pre>{JSON.stringify(invalidCells, null, 2)}</pre>
          </div>
          <div className='alert alert-secondary small mt-2'>
            <h5 className='alert-heading'>Data</h5>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
