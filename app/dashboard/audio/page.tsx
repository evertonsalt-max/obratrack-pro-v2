'use client'
import { Mic } from 'lucide-react'
export default function AudioPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-extrabold text-white mb-1">Registro por Áudio</h1>
      <p className="text-gray-400 text-sm mb-6">Em desenvolvimento</p>
      <div className="card flex items-center justify-center py-16">
        <div className="text-center">
          <Mic size={40} className="text-gray-600 mx-auto mb-4"/>
          <p className="text-gray-400">Registro por áudio em breve</p>
        </div>
      </div>
    </div>
  )
}
