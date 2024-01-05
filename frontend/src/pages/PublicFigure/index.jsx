import React from 'react'
import { Query } from 'react-apollo'
import query from './query'

export default ({ routeParams: { slug } }) => <Query variables={{ slug }} query={query}>
  {({ loading, error, data }) => <div className='row' style={{ marginTop: '20px' }}>
    <div className='col-md-1' />
    <div className='col-md-1'>
      <div className='publicfigurehead'>
        <div
          style={{
            background: "url('https://debats.s3.amazonaws.com/uploads/public_figure/picture/1/Fran_ois-Hollande.jpg') 50% 50% no-repeat",
            backgroundSize: 'cover',
            backgroundPosition: 'center center'
          }}
          className='publicfigurethumb' />
      </div>
    </div>
    <div class='col-md-3'>
      <div class='publicfiguredescription'>
        <h1 id='PublicFigureTitle'>
          {data && data.publicFigure ? data.publicFigure.name : '...'}
        </h1>
        <p className='figure-presentation-text'>
          {data && data.publicFigure ? data.publicFigure.presentation : '...'}
        </p>
      </div>
    </div>
  </div>}
</Query>
