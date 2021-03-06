import React, { PureComponent } from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import io from 'socket.io-client';
import { Row, Col, Avatar, List, Collapse, Input, Button, Icon, Badge } from 'antd';
import { Scrollbars } from 'react-custom-scrollbars';
import MessageView from './MessageView';
import Spin from 'elements/Spin/Second';
import PageHeaderWrapper from 'components/PageHeaderWrapper/withoutScroll';
import PaperPlane from 'elements/Icon/PaperPlane';
import * as conversationActions from '_redux/actions/conversations';
import * as messageActions from '_redux/actions/messages';
import { fromNow, truncate } from 'utils/utils';
import styles from './index.module.less';

const { Panel } = Collapse;


class Messenger extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            curConverId: null,
            message: '',
            firstUser: null,
        };
        this.connectSocketIO();
    }

    componentDidMount() {
        const { fetchConversations } = this.props;
        fetchConversations();
    }

    componentDidUpdate(prevProps) {
        const { conversations, firstConversation, currentUser, userId } = this.props;
        const { conversations: prevConversations } = prevProps;
        if (prevConversations === null && conversations !== null) {
            if (!firstConversation) {
                if (!_.isEmpty(conversations)) {
                    const firstConver = _.maxBy(_.toArray(conversations), conv => conv.updatedAt);
                    const { fetchCurrentUser, fetchMessages } = this.props;
                    fetchMessages(firstConver._id);
                    fetchCurrentUser(firstConver._id);
                    this.socket.emit('joinConversation', firstConver._id, userId);
                    this.setState({
                        curConverId: firstConver._id
                    });
                }
            }
            else {
                this.setState({
                    firstUser: {
                        ...currentUser
                    }
                });
            }
        }
    }

    componentWillUnmount() {
        const {
            resetConversations,
            resetMessages,
            resetCurrentUser
        } = this.props;
        resetConversations();
        resetMessages();
        resetCurrentUser();
        this.socket.disconnect();
    }

    connectSocketIO = () => {
        const { addNewMessage, updateLastMessAndUpdatedAt, updateSeenMessages } = this.props;
        this.socket = io.connect(`https://18.189.6.37/chat`);
        this.socket.on('connect', () => {
            console.log('Socket connection!');
        });
        this.socket.on('disconnect', () => {
            console.log('Disconnect socket!');
        });
        this.socket.on('message', ({ message, conversation }) => {
            addNewMessage(message);
            updateLastMessAndUpdatedAt(conversation._id, message.content, conversation.updatedAt);
        });
        this.socket.on('seen', (messageIds) => {
            updateSeenMessages(messageIds);
        })
    }

    parseToMessageListsByDate = messages => {
        let messageListsByDate = [];
        let currentTime = null;
        let currentObj = null;
        for (let i = 0; i < messages.length; ++i) {
            const message = messages[i];
            const time = moment(message.createdAt).format("MMM D");
            if (time !== currentTime) {
                currentTime = time;
                currentObj = {
                    day: currentTime,
                    messages: [message],
                };
                messageListsByDate.push(currentObj);
            }
            else {
                currentObj.messages.push(message);
            }
        }
        return messageListsByDate;
    };

    handleScrollConverList = e => {
        const element = e.srcElement;
        if (element.scrollTop === element.scrollHeight - (window.innerHeight - 128)) {
            const { fetchOldConversations, converLoading, converOldLoading } = this.props;
            if (!converLoading && !converOldLoading) fetchOldConversations();
        }
    }

    handleClickConver = converId => {
        const { fetchMessages, fetchCurrentUser, currentUser, saveCurrentUser, resetMessages, userId } = this.props;
        const { curConverId } = this.state;
        if (currentUser.converId !== converId) {
            if (_.startsWith(converId, 'new_conver_')) {
                this.setState({
                    curConverId: null
                });
                saveCurrentUser(this.state.firstUser);
                resetMessages();
                if (curConverId) {
                    this.socket.emit('leaveConversation', curConverId, userId);
                }
            }
            else {
                fetchMessages(converId);
                fetchCurrentUser(converId);
                if (curConverId) {
                    this.socket.emit('leaveConversation', curConverId, userId);
                }
                this.socket.emit('joinConversation', converId, userId);
                this.setState({
                    curConverId: converId
                });
            }
        }
    }

    handleTypeMessage = e => {
        const val = e.target.value;
        this.setState({
            message: val
        });
    }

    handleSendMessage = () => {
        const { message, curConverId } = this.state;
        if (message && _.trim(message) !== '') {
            const {
                sendMessage,
                currentUser,
            } = this.props;
            const userId = currentUser._id;
            const callback = converId => {
                this.socket.emit('joinConversation', converId, userId);
            }
            sendMessage(curConverId, userId, _.trim(message), callback);
            this.setState({
                message: ''
            });
        }
    }

    render() {
        let {
            messages,
            conversations,
            currentUser,
            messagesLoading,
            messagesOldLoading,
            converLoading,
            converOldLoading,
            currentLoading,
            fetchOldMessages,
            history,
            firstConversation
        } = this.props;

        if (conversations !== null) {
            conversations =  _.orderBy(conversations, ['updatedAt'], ['desc']);
            if (firstConversation) conversations = _.concat([firstConversation], conversations);
        }
        messages = this.parseToMessageListsByDate(messages);
        const disabledInput = messagesLoading || converLoading || conversations === null || currentUser === null || currentLoading;

        return (
            <PageHeaderWrapper>
                <Row className={styles.messenger}>
                    <Col className={styles.conversations} span={6}>
                        <div className={styles.header}>
                            <Icon type="message" style={{ fontSize: 20, color: 'yellowgreen' }} />
                            <span className={styles.title}>Messenger</span>
                        </div>
                        <div className={styles.convers}>
                            <Scrollbars
                                autoHeight
                                autoHeightMax={window.innerHeight - (64 + 64)}
                                onScroll={this.handleScrollConverList}
                            >
                                {conversations === null || converLoading ? (
                                    <div style={{ height: `${window.innerHeight - (64 + 64)}px`, width: '100%'}}>
                                        <Spin fontSize={7} />
                                    </div>
                                ) : (
                                    <React.Fragment>
                                        <List
                                            className={styles.conversationsList}
                                            dataSource={conversations}
                                            rowKey={item => item._id + _.uniqueId('conver_')}
                                            renderItem={item => (
                                                <List.Item 
                                                    className={(currentUser && (currentUser.converId === item._id)) ? classNames(styles.item, styles.select) : styles.item}
                                                    extra={<span style={{ fontSize: '13px', color: 'gray' }}>{ fromNow(item.updatedAt) }</span>}
                                                    onClick={() => this.handleClickConver(item._id)}
                                                >
                                                    <List.Item.Meta
                                                        avatar={<Avatar src={item.avatar} size={36} />}
                                                        title={<span>{truncate(item.name, 46)}</span>}
                                                        description={!item.seen ? (<span style={{ color: 'yellowgreen', fontWeight: 'bold' }}>{truncate(item.lastMessage, 46)}</span>) : (<span>{truncate(item.lastMessage, 46)}</span>)}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                        {converOldLoading && (
                                            <div className={styles.oldConverLoading}>
                                                <Spin fontSize={5} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                )}
                            </Scrollbars>
                        </div>
                    </Col>
                    <Col className={styles.rightCont} span={18}>
                        <div className={styles.header}>
                            {currentUser !== null && !currentLoading && (
                                <React.Fragment>
                                    <Avatar size={36} src={currentUser.avatar} />
                                    <span className={styles.name}>{currentUser.name}</span>
                                    <div className={styles.status}>
                                        <Badge status={currentUser.online ? "processing" : "error"} color={currentUser.online ? "#1890ff" : "red"} />
                                        <span style={{ color: (currentUser.online ? "#1890ff" : "red") }}>{currentUser.online ? "online" : "offline"}</span>
                                    </div>
                                </React.Fragment>
                            )}                
                        </div>
                        <Row className={styles.content}>
                            <Col className={styles.messages} span={16}>
                                {messagesLoading ? (
                                    <div style={{ height: `${window.innerHeight - 64 - 64 - 50}px`, position: 'relative'}}>
                                        <Spin fontSize={6} />
                                    </div>
                                ) : (
                                    <MessageView 
                                        messages={messages}
                                        converId={(currentUser && currentUser.converId) || null}
                                        fetchOldMessages={fetchOldMessages}
                                        oldLoading={messagesOldLoading}
                                    />
                                )}
                                <div className={styles.typeMessage}>
                                    <Input placeholder="Enter message..." disabled={disabledInput} value={this.state.message} onChange={this.handleTypeMessage} onPressEnter={this.handleSendMessage}/>
                                    <PaperPlane onClick={this.handleSendMessage} />
                                </div>
                            </Col>
                            <Col className={styles.info} span={8}>
                                <div className={styles.avatar}>
                                    {currentUser !== null && !currentLoading && (
                                        <React.Fragment>
                                            <Avatar size={111} src={currentUser.avatar} />
                                            <div className={styles.name}>{currentUser.name}</div>
                                        </React.Fragment>
                                    )}
                                    {currentLoading && (
                                        <div className={styles.avatarLoading}>
                                            <Spin fontSize={5} />
                                        </div>
                                    )}
                                </div>
                                <Collapse
                                    bordered={false}
                                    defaultActiveKey={['option']}
                                >
                                    <Panel header={<span style={{ color: 'gray', fontWeight: 'bold' }}>OPTIONS</span>} key="option">
                                        {currentUser !== null && !currentLoading && (
                                            <React.Fragment>
                                                <Row className={styles.option}>
                                                    <Col span={20} className={styles.action}>
                                                        Find in conversation
                                                    </Col>
                                                    <Col span={4} className={styles.icon}>
                                                        <Button type="dashed" shape="circle" icon="search" onClick={() => history.push(`/streamer/${currentUser._id}`)}/>
                                                    </Col>
                                                </Row>
                                                <Row className={styles.option}>
                                                    <Col span={20} className={styles.action}>
                                                        Change color
                                                    </Col>
                                                    <Col span={4} className={styles.icon}>
                                                        <Button type="dashed" shape="circle" icon="edit" />
                                                    </Col>
                                                </Row>
                                                <Row className={styles.option}>
                                                    <Col span={20} className={styles.action}>
                                                        View profile
                                                    </Col>
                                                    <Col span={4} className={styles.icon}>
                                                        <Button type="dashed" shape="circle" icon="profile" />
                                                    </Col>
                                                </Row>
                                            </React.Fragment>
                                        )}
                                        {currentLoading && (
                                            <div className={styles.optionLoading}>
                                                <Spin fontSize={5} />
                                            </div>
                                        )}
                                    </Panel>
                                    <Panel header={<span style={{ color: 'gray', fontWeight: 'bold' }}>SHARED IMAGES</span>} key="images">

                                    </Panel>
                                </Collapse>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </PageHeaderWrapper>
            
        )
    }
}

const mapStateToProps = ({ global: globalState, conversations, messages, loading }) => ({
    firstConversation: conversations.first,
    conversations: conversations.list,
    currentUser: messages.current,
    messages: _.concat(messages.old, messages.new, messages.sending),
    converLoading: loading['fetchConversations'] || false,
    converOldLoading: loading['fetchOldConversations'] || false,
    currentLoading: loading['fetchCurrentUser'] || false,
    messagesLoading: loading['fetchMessages'] || false,
    messagesOldLoading: loading['fetchOldMessages'] || false,
    userId: globalState.user._id,
});

const mapDispatchToProps = dispatch => ({
    fetchConversations: () => dispatch(conversationActions.fetchConversations()),
    fetchOldConversations: () => dispatch(conversationActions.fetchOldConversations()),
    fetchMessages: converId => dispatch(messageActions.fetchMessages(converId)),
    fetchOldMessages: converId => dispatch(messageActions.fetchOldMessages(converId)),
    fetchCurrentUser: converId => dispatch(messageActions.fetchCurrentUser(converId)),
    saveCurrentUser: currentUser => dispatch(messageActions.saveCurrentUser(currentUser)),
    sendMessage: (converId, userId, message, cb) => dispatch(messageActions.sendMessage(converId, userId, message, cb)),
    resetConversations: () => dispatch(conversationActions.resetConversations()),
    resetMessages: () => dispatch(messageActions.resetMessages()),
    resetCurrentUser: () => dispatch(messageActions.resetCurrentUser()),
    addNewMessage: message => dispatch(messageActions.addNewMessage(message)),
    updateSeenMessages: messageIds => dispatch(messageActions.updateSeenMessages(messageIds)),
    updateLastMessAndUpdatedAt: (converId, lastMessage, updatedAt) => dispatch(conversationActions.updateLastMessageAndUpdatedAt(converId, lastMessage, updatedAt))
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Messenger));