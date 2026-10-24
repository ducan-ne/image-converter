import "./build.css"
import Converter, { type ConverterProps } from "./Converter.tsx"

// The remote entry that bannerify.co loads. A page passes its props here, for example
// { defaultFormat: "jpeg" }.
const App = (props: ConverterProps) => {
  return (
    <div className="w-full h-full flex justify-center items-center" suppressHydrationWarning>
      <Converter {...props} />
    </div>
  )
}

export default App
