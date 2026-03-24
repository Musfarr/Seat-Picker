const TEMPLATE_URL = 'https://mediaupload.convexinteractive.com/api/file/1774355532846-597792243.png'

export default function Lanyard({ name, seatNumber, cnic, imageUrl }) {
  return (
    <div
      className="lanyard-card"
      style={{ backgroundImage: `url(${TEMPLATE_URL})` }}
    >
      <div className="lanyard-content">
        {imageUrl && (
          <img src={imageUrl} alt={name} className="lanyard-photo" />
        )}
        <p className="lanyard-name">{name}</p>
        <p className="lanyard-seat">{seatNumber}</p>
        {cnic && <p className="lanyard-cnic">CNIC: {cnic}</p>}
      </div>
    </div>
  )
}
