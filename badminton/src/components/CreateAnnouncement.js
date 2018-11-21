import React, { Component } from 'react';

import { firebase } from '../firebase'
import { db as database } from '../firebase/firebase';
import { db } from '../firebase';
import { byPropKey } from '../helpers/helpers';
import { withRouter } from 'react-router-dom';
import withAuthorization from './withAuthorization';
import * as routes from '../constants/routes';

const INITIAL_STATE = {
  title: '',
  content: ''
};

class CreateAnnouncementPage extends Component{
  constructor(props){
    super(props);

    this.state = {...INITIAL_STATE};
  }

  onSubmit(event) {
    event.preventDefault();

    const{
      history,
    } = this.props;

    const ttitle = this.state.title;
    const tcontent = this.state.content;

    const tauthor = firebase.auth.currentUser.uid;

    database.ref(`announcements`).push().set({
      'title': ttitle,
      'content': tcontent,
      'author': tauthor
    });

    history.push(routes.HOME);
  }

  render(){
    const{
      title,
      content
    } = this.state;

    const isInvalid = title === '' || content === '';

    return(
      <div>
        <h1>Create An Announcement</h1>
        <form onSubmit={event => this.onSubmit(event)}>
          <div className="form-group">
            <input
              id="announcement-title"
              value={title}
              onChange={event => this.setState(byPropKey('title', event.target.value))}
              type="text"
              placeholder="Title"
            />
          </div>
          <div className="form-group">
            <textarea
              id="announcement-content"
              onChange={event => this.setState(byPropKey('content', event.target.value))}
              value={content}></textarea>
          </div>
          <div className="form-group">
            <button disabled={isInvalid} type="submit">
              Create Announcement
            </button>
          </div>
        </form>
      </div>
    );
  }
}

const authCondition = async (authUser) => {
  if(! !!firebase.auth.currentUser){
    return false;
  }
  var uid = firebase.auth.currentUser.uid;
  return await db.userIsAdmin(uid);
}

export default withAuthorization(authCondition)(withRouter(CreateAnnouncementPage));