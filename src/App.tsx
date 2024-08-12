import "./build.css"
import Converter from "./Converter.tsx"
// import test from "./test.ts?worker"

// new test()

const App = () => {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <Converter />
    </div>
  )
}

export default App
