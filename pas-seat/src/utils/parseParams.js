export function parseParams() {
  const p = new URLSearchParams(window.location.search)
  const phone_number = p.get('phone_number')
  const Email_Address = p.get('Email_Address')
  const flow_token = p.get('flow_token')
  const Company_Name = p.get('Company_Name')
  const Full_Name = p.get('Full_Name')
  const Designation = p.get('Designation')
  const CNIC_Number = p.get('CNIC_Number')
  const Image = p.get('Image')
  const seats_api_url = p.get('seats_api_url') || null
  const Number_of_ticket = parseInt(p.get('Number_of_ticket'), 10)

  if (!phone_number) return null

  const isCorporate = !isNaN(Number_of_ticket) && Number_of_ticket > 0

  return {
    flow: isCorporate ? 'corporate' : 'individual',
    allowedSeats: isCorporate ? Number_of_ticket : 1,
    allowedTypes: ['normal', 'vip'],
    phone_number,
    Email_Address,
    flow_token,
    Company_Name,
    Full_Name,
    Designation,
    CNIC_Number: CNIC_Number || null,
    Image: Image || null,
    seats_api_url,
  }
}
