import { createSignal } from 'solid-js'
import IntegrationDashboard from './examples/EnergyIntegrator'
import PhaseSpaceDiagram from './examples/PhaseDiagram'

function App() {

  return (
    <>
      <IntegrationDashboard />
      <PhaseSpaceDiagram />
    </>
  )
}

export default App
