import React, { Component } from 'react';

import withAuthorization from './withAuthorization';
import Alert from './Alert';

import { db as database } from '../firebase/firebase';
import { firebase, admin, db } from '../firebase';
import { byPropKey } from '../helpers/helpers';
import * as config from '../constants/config';

const RankingPage = () =>
  <div>
    <h1>Rankings</h1>
    <Ranks />
  </div>

class Ranks extends Component{
  constructor(props){
    super(props);
    this.state = {
      users: null,
      alert: null,
      currentUser: null,
    };
    this.requestChallenge = this.requestChallenge.bind(this);
  }

  requestChallenge(key, username, rank){
    var currentUser = firebase.auth.currentUser.uid;
    if(currentUser !== key){
      var requestRef = database.ref(`pending-challenge-requests`);
      requestRef.once('value', (requestSnap) => {
        var requests = requestSnap.val();
        for(var rKey in requests){
          if(requests[rKey].challenger === currentUser && requests[rKey].opponent === key){
            this.setState(byPropKey('alert', <Alert
              text={'You already made this request.'}
              color={'#ff0000'}
            />));
            return;
          }
        }
        if(this.state.currentUser.rank < rank || this.state.currentUser.rank - rank > config.RANK_DIST){
          this.setState(byPropKey('alert', <Alert
            text={'You can only challenge players ranked up to four places better than you.'}
            color={'#ff0000'}
          />));
          return;
        }
        requestRef.push({
          'challenger': firebase.auth.currentUser.uid,
          'opponent': key,
        });
        this.setState(byPropKey('alert', <Alert
          text={'Your request was received and is being processed.'}
          color={'#00ff00'}
          />
        ));
      });
    }else{
      this.setState(byPropKey('alert', <Alert
        text={'You cannot challenge yourself.'}
        color={'#ff0000'}
      />));
    }
    setTimeout(() => {this.setState(byPropKey('alert', null))}, 4000);
  }

  deactivate(uid){
    // TODO: deactivate user.
  }

  promote(uid){
    database.ref(`users/${uid}`).update({
      admin: true
    });
  }

  demote(uid){
    database.ref(`users/${uid}`).update({
      admin:false
    });
  }

  componentDidMount(){
    database.ref(`users`).orderByChild('rank').on('value', (snapshot) => {
      var newUsers = []
      snapshot.forEach(function(childSnap){
        var user_obj = childSnap.val();
        user_obj.key = childSnap.key;
        user_obj.challengeButton = false;
        newUsers.push(user_obj);
      });
      this.setState({users: newUsers}, () => {
        database.ref(`users/${firebase.auth.currentUser.uid}`).once('value', (snapshot) => {
          var snapUser = snapshot.val();
          var rank = snapUser.rank;
          var id = snapshot.key;
          snapUser.key = id;
          var users = this.state.users;
          this.setState(byPropKey('currentUser', snapUser));
          database.ref(`users`).orderByChild('rank').startAt(rank - config.RANK_DIST).endAt(rank - 1).on('value', (userSnap) => {
            var rankRangeUsers = [];
            userSnap.forEach(function(childSnap){
              rankRangeUsers.push(childSnap.val());
            });
            database.ref(`pending-challenge-requests`).on('value', (requestSnap) => {
              var requests = requestSnap.val();
              for(var i = 0; i<rankRangeUsers.length; i++){
                const userInd = rankRangeUsers[i].rank - 1;
                users[userInd].challengeButton = true;
                for(var key in requests){
                  if(requests[key].challenger === id && requests[key].opponent === users[userInd].key){
                    users[userInd].challengeButton = false;
                  }
                }
              }
              this.setState(byPropKey('users', users));
            });
          });
        });
      });
    });
  }

  render(){
    const currUser = this.state.currentUser;
    var userList = null;
    if(!!currUser && !!this.state.users){
      console.log(this.state.users)
      userList = this.state.users.map((user) =>
        <div className="rank-element" key={user.key}>
          <div className="rank-rank">
            {user.rank}
          </div>
          <div className="rank-user-controls">
            <div className="rank-username">
              {user.username}
            </div>
            {user.challengeButton && <ChallengeButton user={user} onClick={this.requestChallenge}/>}
            {!user.admin && currUser.admin && <AdminButton text={'Promote To Admin'} onClick={() => this.promote(user.key)}/>}
            {user.admin  && currUser.admin && <AdminButton text={'Demote Admin'} onClick={() => this.demote(user.key)} />}
            {currUser.admin && <AdminButton text={'Kick'} onClick={() => this.deactivate(user.key)}/>}
          </div>
        </div>
      );
    }
    return(
      <div>
        {this.state.alert}
        {userList}
      </div>
    );
  }
}

const ChallengeButton = ({ user, onClick }) =>
  <div>
    <button onClick={() => onClick(user.key, user.username, user.rank)}>Request Challenge</button>
  </div>

const AdminButton = ({text, onClick}) =>
  <div>
    <button onClick={onClick}>{text}</button>
  </div>

const authCondition = (authUser) => !!authUser;

export default withAuthorization(authCondition)(RankingPage);
