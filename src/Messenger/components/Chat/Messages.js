import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { graphql, compose } from "react-apollo";
import gql from "graphql-tag";

import MESSAGES_QUERY from "./Messages.graphql";
import { THREADS_QUERY } from "../Threads";
import colours from "App/styles/export/colours.css";
import Avatar from "App/components/Layout/Avatar";
import Icon from "App/components/Layout/Icon";

const MessagesWrapper = styled.div`
  display: flex;
  flex: 2;
  flex-direction: column;
  justify-content: space-between;
`;

const MessagesList = styled.div`
  padding: 1em;
  overflow-y: auto;
  p {
    color: ${colours.darkGrey};
    font-size: 0.9em;
  }
`;

const NewMessage = styled.div`
  min-height: 20px;
  padding: 1em;
  border-top: 1px solid ${colours.mediumGrey};
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  height: 60px;
`;

const MessageBox = styled.input`
  border-color: transparent;
  width: 90%;
`;

const MessageWrapper = styled.div`
  padding: 0.5em;
  display: flex;

  ${props =>
    props.from === "sent" &&
    `
      justify-content: flex-end;
    `}
`;

const MessageRead = styled.div`
  display: flex;
  flex-flow: column;
  justify-content: flex-end;
`;

const Message = styled.div`
  border-radius: 20px;
  padding: 0.5em 1em;
  display: inline-block;
  font-size: 0.9rem;
  background: ${props =>
    props.from === "received" ? colours.lightGrey : colours.lightBlue};
  color: ${props =>
    props.from === "received" ? colours.black : colours.white};
`;

class Messages extends React.Component {
  state = {
    newMessage: ""
  };

  sendMessage = async () => {
    const { username } = this.props;
    const { newMessage } = this.state;

    await this.props.sendMessage({
      variables: {
        to: username,
        from: "me",
        message: newMessage
      }
    });

    this.setState({ newMessage: "" });
  };

  render() {
    const {
      data: { messagesConnection, loading, error },
      username
    } = this.props;
    if (error) {
      return <h2>{error.message}</h2>;
    } else if (loading) {
      return <h2>Loading...</h2>;
    }

    const conversation = messagesConnection.edges.map(({ node }, i) => (
      <MessageWrapper key={i} from={node.from === "you" ? "sent" : "received"}>
        {node.to === "you" && <Avatar username={username} size="medium" />}
        <Message from={node.from === "you" ? "sent" : "received"}>
          {node.message}
        </Message>
        {node.from === "you" && (
          <MessageRead>
            <Icon name="check-circle" size={0.6} />
          </MessageRead>
        )}
      </MessageWrapper>
    ));

    return (
      <MessagesWrapper>
        <MessagesList>
          {conversation.length ? conversation : <p>You have no messages</p>}
        </MessagesList>
        <NewMessage>
          <MessageBox
            onChange={e => this.setState({ newMessage: e.target.value })}
            type="text"
            value={this.state.newMessage}
            placeholder="Type your message..."
          />
          <button onClick={this.sendMessage}>Send</button>
        </NewMessage>
      </MessagesWrapper>
    );
  }
}

Messages.propTypes = {
  data: PropTypes.object,
  username: PropTypes.string.isRequired
};

Messages.defaultProps = {
  data: {
    loading: true
  }
};

const SEND_MESSAGE_MUTATION = gql`
  mutation sendMessage($from: String!, $to: String!, $message: String!) {
    sendMessage(input: { from: $from, to: $to, message: $message }) {
      id
      time
      to
      from
      message
    }
  }
`;

const sendMessage = graphql(SEND_MESSAGE_MUTATION, {
  options: props => ({
    refetchQueries: [
      {
        query: MESSAGES_QUERY,
        variables: { username: props.username }
      }
    ],
    update: (store, { data: { sendMessage } }) => {
      const query = { query: THREADS_QUERY };

      // Read the data from our cache for this query.
      const data = store.readQuery(query);

      // Mutate the cached data
      data.threadsConnection.edges.map(({ node }) => {
        if (node.username === sendMessage.to) {
          node.lastMessage = {
            ...node.lastMessage,
            ...sendMessage
          };
        }
        return { node };
      });

      // Write our data back to the cache.
      store.writeQuery({ ...query, data });
    }
  }),
  name: "sendMessage"
});

export default compose(
  graphql(MESSAGES_QUERY),
  sendMessage
)(Messages);
