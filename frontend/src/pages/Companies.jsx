import CompanyForm from '../components/CompanyForm'

export default function Companies({ companies, onSave, onDelete, onClose, showModal }) {
  if (!showModal) return null
  
  return (
    <CompanyForm
      companies={companies}
      onSave={onSave}
      onDelete={onDelete}
      onClose={onClose}
    />
  )
}
