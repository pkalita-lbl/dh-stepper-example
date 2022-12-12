import React, { useState, useRef, useMemo } from 'react'
import DataHarmonizer from './components/DataHarmonizer'
import Stepper from './components/Stepper'

import schema from './schema.json'

// controls which field is used to merge data from different DH views
const ID_FIELD = 'source_mat_id'
// controls which rows are shown in each view
const TYPE_FIELD = 'type'

const BIOSAMPLE_CLASSES = [
  'air', 
  'biofilm', 
  'bioscales',
  'built_env', 
  'host-associated', 
  'plant-associated', 
  'sediment', 
  'soil', 
  'wastewater_sludge',
  'water'
]

const MIXINS = [
  'emsl_mixin',
  'jgi_mg_mixin',
  'jgi_mt_mixin',
]

const TEMPLATES = [
  BIOSAMPLE_CLASSES[7],
  MIXINS[0],
  MIXINS[2]
]

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
        type: ['MetaT'],
        depth: 'asdf'
      },
      {
        id: 2,
        name: 'y',
        type: ['MetaG'],
        depth: 'qwert'
      },
      {
        id: 3,
        name: 'z',
        type: ['MetaT', 'MetaP'],
        depth: 'xcvbn'
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
    if (activeTemplate === TEMPLATES[0]) {
      return data
    } else {
      return data.filter(row => row[TYPE_FIELD] && row[TYPE_FIELD].includes(activeTemplate))
    }
  }, [data, activeTemplate])


  const idCol = dhRef.current?.getFieldYCoordinates()[ID_FIELD]
  
  return (
    <div className='p-4'>
      <div className="row">
        <div className="col-7">
          <Stepper steps={TEMPLATES} active={active} onChange={handleStepChange} />
          <button className='btn btn-warning mb-2' onClick={handleValidate}>Validate</button>
          <DataHarmonizer 
            schema={schema} 
            template={activeTemplate} 
            data={filteredData} 
            invalidCells={invalidCells[activeTemplate]}
            readOnlyCols={activeTemplate === TEMPLATES[0] ? [] : [idCol]}
            dhRef={dhRef} 
          />
          <button className="btn btn-outline-secondary mt-2" onClick={handleAddTestData}>Test Data</button>
        </div>
        <div className="col-5 border-left">
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
