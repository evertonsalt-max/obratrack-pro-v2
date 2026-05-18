'use client'
import { Upload } from 'lucide-react'
export default function ImportarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-white mb-1">Importar Planilha</h1>
      <p className="text-gray-400 text-sm mb-6">Em desenvolvimento</p>
      <div className="card flex items-center justify-center py-16">
        <div className="text-center">
          <Upload size={40} className="text-gray-600 mx-auto mb-4"/>
          <p className="text-gray-400">Importação de planilhas em breve</p>
        </div>
      </div>
    </div>
  )
}
