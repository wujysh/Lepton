'use strict'

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Button, Alert } from 'react-bootstrap'

import './index.scss'

class AlertCard extends Component {
  constructor(props) {
	super(props)
    this.state = {
      alertVisible: true
    }
  }

  returnBsStyle() {
    return 'danger'
  }

  render() {
    if (this.state.alertVisible) {
      return (
        <Alert
		  className='alert-section'
		  bsStyle={ this.returnBsStyle() }
		  onDismiss={ this.handleAlertDismiss.bind(this) }>
          <div className='alert-content'>Gist udpated!</div>
        </Alert>
      )
    }

	return null
  }

  handleAlertDismiss() {
    this.setState({alertVisible: false})
  }

  handleAlertShow() {
    this.setState({alertVisible: true})
  }
}

function mapStateToProps (state) {
  return {
    userSession: state.userSession,
    searchWindowStatus: state.searchWindowStatus
  }
}

export default connect(mapStateToProps)(AlertCard)
