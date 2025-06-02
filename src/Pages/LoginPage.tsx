import React from "react";
import { Form, Input, Button } from "@heroui/react";
import { useNavigate } from "react-router";

function App() {
  const [submitted, setSubmitted] = React.useState(null);
    const navigate = useNavigate();
  const onSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setSubmitted(data);
     navigate('/home');
  };

  return (
    <div className=' w-screen h-screen flex flex-col justify-center items-center' >
      <div className="w-[60%] gap- flex justify-center p-5 ">
        <div className="w-[40%]">
          <h1 className="text-9xl">M</h1>
             <h1 className="text-9xl">O R</h1>
          <p>O mapa otimizador de rotas para oficiais</p>
        </div>
        <Form className="w-[50%] flex flex-col items-center justify-center" onSubmit={onSubmit}>
          <Input
            isRequired
            errorMessage="Coloque um email valido"
            name="email"
            className="border border-gray-500 rounded-xl"
            placeholder="Enter your email"
            type="email"
          />
           <Input
            isRequired
            errorMessage="Esqueceu a senha"
            name="password"
              className="border border-gray-500 rounded-xl"
            placeholder="Enter your password"
            type="password"
          />
          <Button type="submit" className="w-[80%]" size="lg" >
            Entrar
          </Button>
        </Form>
      </div>

    </div>
  )
}

export default App
