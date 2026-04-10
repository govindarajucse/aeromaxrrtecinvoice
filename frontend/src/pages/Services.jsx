import ServiceForm from '../components/ServiceForm'

export default function Services({ services, onSave, onDelete, onClose, showModal }) {
  if (!showModal) return null
  
  return (
    <ServiceForm
      services={services}
      onSave={onSave}
      onDelete={onDelete}
      onClose={onClose}
    />
  )
}
