import "./build.css"
import Converter from "./Converter.tsx"

const App = () => {
  return (
    <div className="w-full h-full flex justify-center items-center" suppressHydrationWarning>
      <Converter />
    </div>
  )
}

export default App
